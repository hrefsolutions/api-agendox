import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { UnauthorizedError } from '@shared/errors';

import type { SuperAdminPrincipal } from './super-admin.guard';

/** Injects the authenticated super-admin principal (set by {@link SuperAdminGuard}). */
export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SuperAdminPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ superAdmin?: SuperAdminPrincipal }>();
    if (!request.superAdmin) {
      throw new UnauthorizedError('No estás autenticado como super admin');
    }
    return request.superAdmin;
  },
);
