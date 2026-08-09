import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '@shared/domain';
import { ForbiddenError, UnauthorizedError } from '@shared/errors';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { StaffPrincipal } from '../tenant/request-context';

/**
 * Global authorization guard. Routes without `@Roles(...)` are allowed for any
 * authenticated user; routes with roles require the principal's role to match.
 * Runs after {@link AuthGuard}, so the principal is already on the request.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: StaffPrincipal }>();
    const principal = request.user;
    if (!principal) {
      throw new UnauthorizedError('No estás autenticado');
    }
    if (!required.includes(principal.role)) {
      throw new ForbiddenError('No tenés el rol necesario para esta acción', {
        required,
        actual: principal.role,
      });
    }
    return true;
  }
}
