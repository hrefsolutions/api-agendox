/**
 * Framework-agnostic error kernel.
 *
 * These errors belong to the Domain / Application layers and MUST NOT depend on
 * NestJS or HTTP. The interface layer (see `AllExceptionsFilter`) is responsible
 * for translating them into transport-specific responses.
 *
 * Each error carries a stable, machine-readable `code` so clients and logs can
 * react without string-matching human messages.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable identifier (e.g. `RESOURCE_NOT_FOUND`). */
  abstract readonly code: string;

  /** Optional structured context (never include secrets or PII). */
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** The requested entity does not exist within the current tenant scope. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

/** The operation conflicts with the current state (e.g. uniqueness). */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

/** Input failed a domain/application-level invariant. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

/** The caller is not authenticated. */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}

/** The caller is authenticated but not allowed to perform the action. */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/** A business rule (see docs/business-rules.md) was violated. */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
}

/**
 * The caller exceeded an application-level quota (distinct from the global
 * per-IP throttler, which lives in the transport layer). `details.retryAfterSeconds`
 * tells the client how long to wait, so the UI can show a real countdown instead
 * of a generic error.
 */
export class RateLimitError extends DomainError {
  readonly code = 'RATE_LIMITED';

  constructor(message: string, readonly retryAfterSeconds: number) {
    super(message, { retryAfterSeconds });
  }
}
