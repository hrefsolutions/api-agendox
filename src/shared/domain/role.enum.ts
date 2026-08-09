/**
 * Tenant-scoped roles for internal staff users (see docs/05-roles-permisos.md).
 *
 * `SUPER_ADMIN` (platform-global) and `CUSTOMER` (end client via OTP) are
 * intentionally out of this enum: the former is out of the MVP scope and the
 * latter is not an internal user and authenticates through a separate flow.
 */
export enum Role {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  Receptionist = 'RECEPTIONIST',
  ResourceOperator = 'RESOURCE_OPERATOR',
}

export const ALL_ROLES: readonly Role[] = Object.values(Role);
