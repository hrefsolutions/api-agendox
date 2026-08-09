import { AsyncLocalStorage } from 'node:async_hooks';

import type { Role } from '@shared/domain';

/**
 * Authenticated internal (staff) user resolved from a validated access token.
 * The `organizationId` is derived from the token, never trusted from the body
 * (see docs/04-multi-tenancy.md).
 */
export interface StaffPrincipal {
  userId: string;
  organizationId: string;
  role: Role;
  email: string;
}

/**
 * Authenticated end customer (via OTP). Not an internal user; identified by
 * email within a public Organization (tenant derived from the customer token).
 */
export interface CustomerPrincipal {
  organizationId: string;
  email: string;
}

/** Per-request ambient context, carried across async boundaries via ALS. */
export interface RequestContext {
  requestId?: string;
  principal?: StaffPrincipal;
}

/**
 * Request-scoped context without request-scoped DI providers. Populated by a
 * middleware at the start of every request and enriched by the auth guard.
 * Singletons read it through {@link TenantContextService}.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Functional middleware that opens the ALS store for the request. Runs before
 * guards, so the auth guard can populate the principal into the same store.
 */
export function requestContextMiddleware(
  req: { id?: string },
  _res: unknown,
  next: () => void,
): void {
  requestContext.run({ requestId: req.id }, () => next());
}
