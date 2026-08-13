import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '@shared/errors';

/**
 * Standardized error response envelope returned for every unhandled error.
 */
export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * Global exception filter.
 *
 * Responsibilities:
 * - Map framework-agnostic {@link DomainError}s to HTTP status codes, keeping the
 *   domain layer free of transport concerns.
 * - Preserve NestJS {@link HttpException}s (e.g. produced by the global
 *   ValidationPipe).
 * - Convert anything else into a safe 500 without leaking internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const { status, code, message, details } = this.resolve(exception);

    const body: ErrorResponseBody = {
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
      details,
    };

    if (status >= 500) {
      // Report unexpected failures to Sentry (no-op if not initialized).
      Sentry.captureException(exception, {
        tags: { path: request.url, method: request.method },
        extra: { requestId: request.id },
      });
      this.logger.error(
        {
          err: exception,
          requestId: request.id,
          path: request.url,
          method: request.method,
        },
        'Unhandled exception',
      );
    } else {
      this.logger.warn(
        { code, status, requestId: request.id, path: request.url },
        typeof message === 'string' ? message : 'Request rejected',
      );
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string | string[];
    details?: Record<string, unknown>;
  } {
    if (exception instanceof DomainError) {
      return {
        status: this.mapDomainErrorStatus(exception),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      // Nest wraps validation/message payloads either as a string or an object.
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        code: this.httpStatusToCode(status),
        // El rate limiter de Nest responde "ThrottlerException: Too many
        // requests", que termina en un toast delante del cliente. Los 429 que
        // nacen del dominio traen su propio texto (y su `retryAfterSeconds`):
        // esto es solo para los del guard.
        message:
          status === HttpStatus.TOO_MANY_REQUESTS
            ? 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'
            : message,
      };
    }

    const postgres = this.mapPostgresError(exception);
    if (postgres) return postgres;

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    };
  }

  /**
   * Translates PostgreSQL integrity errors into stable client responses so a
   * unique / exclusion / check / FK violation surfaces as 409/422 rather than a
   * generic 500 (no internal detail is leaked).
   */
  private mapPostgresError(
    exception: unknown,
  ): { status: number; code: string; message: string } | null {
    if (typeof exception !== 'object' || exception === null || !('code' in exception)) {
      return null;
    }
    const code = (exception as { code?: unknown }).code;
    if (typeof code !== 'string') return null;

    switch (code) {
      case '23505': // unique_violation
      case '23P01': // exclusion_violation
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'La operación entra en conflicto con datos existentes',
        };
      case '23514': // check_violation
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Se violó una restricción de datos',
        };
      case '23503': // foreign_key_violation
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Falta un registro referenciado o está en uso',
        };
      case '23502': // not_null_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Falta un campo obligatorio',
        };
      default:
        return null;
    }
  }

  private mapDomainErrorStatus(error: DomainError): number {
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    if (error instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (error instanceof BusinessRuleError) return HttpStatus.UNPROCESSABLE_ENTITY;
    if (error instanceof RateLimitError) return HttpStatus.TOO_MANY_REQUESTS;
    return HttpStatus.BAD_REQUEST;
  }

  private httpStatusToCode(status: number): string {
    const name = HttpStatus[status];
    return typeof name === 'string' ? name : 'HTTP_ERROR';
  }
}
