import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { CustomerPrincipal } from '@common/tenant/request-context';
import { UnauthorizedError } from '@shared/errors';

import { CustomerTokenService } from '../../infrastructure/customer-token.service';

/**
 * Authenticates a customer via their OTP-issued token. Applied explicitly with
 * `@UseGuards` on portal routes (which are `@Public()` to bypass the staff
 * `AuthGuard`). Populates `request.customer`.
 */
@Injectable()
export class CustomerOtpGuard implements CanActivate {
  constructor(private readonly tokens: CustomerTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { customer?: CustomerPrincipal }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('Falta el token de cliente');
    }
    let payload;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedError('El token de cliente es inválido o expiró');
    }
    if (payload.typ !== 'customer') {
      throw new UnauthorizedError('El token no es un token de cliente');
    }
    request.customer = { organizationId: payload.org, email: payload.sub };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : undefined;
  }
}
