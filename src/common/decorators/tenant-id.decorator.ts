import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { UnauthorizedError } from '@shared/errors';

import type { StaffPrincipal } from '../tenant/request-context';

/**
 * Injects the current tenant id, derived from the authenticated principal.
 * Never read the tenant from the request body (see docs/04-multi-tenancy.md).
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: StaffPrincipal }>();
  const organizationId = request.user?.organizationId;
  if (!organizationId) {
    throw new UnauthorizedError('No hay contexto de organización disponible');
  }
  return organizationId;
});
