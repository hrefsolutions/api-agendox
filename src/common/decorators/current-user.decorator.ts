import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { UnauthorizedError } from '@shared/errors';

import type { StaffPrincipal } from '../tenant/request-context';

/** Injects the authenticated staff principal (set by the `AuthGuard`). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StaffPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ user?: StaffPrincipal }>();
    if (!request.user) {
      throw new UnauthorizedError('No estás autenticado');
    }
    return request.user;
  },
);
