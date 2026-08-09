import { SetMetadata } from '@nestjs/common';

import type { Role } from '@shared/domain';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given tenant roles (enforced by `RoleGuard`). */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
