import { Injectable } from '@nestjs/common';

import { UnauthorizedError } from '@shared/errors';

import { getRequestContext, type StaffPrincipal } from './request-context';

/**
 * Read/write facade over the per-request {@link requestContext}. Injected as a
 * singleton; it reads ambient state from AsyncLocalStorage rather than being
 * request-scoped, which keeps the DI graph fast (see docs/11-backend-nestjs.md).
 */
@Injectable()
export class TenantContextService {
  /** Stores the authenticated staff principal for the current request. */
  setPrincipal(principal: StaffPrincipal): void {
    const ctx = getRequestContext();
    if (ctx) ctx.principal = principal;
  }

  get principal(): StaffPrincipal | undefined {
    return getRequestContext()?.principal;
  }

  /** The current tenant id, or throws if there is no authenticated principal. */
  get organizationId(): string {
    const organizationId = this.principal?.organizationId;
    if (!organizationId) {
      throw new UnauthorizedError('No hay contexto de organización disponible');
    }
    return organizationId;
  }

  get requestId(): string | undefined {
    return getRequestContext()?.requestId;
  }
}
