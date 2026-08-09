import type { User } from '../entities/user.entity';

/**
 * Persistence contract for {@link User}. Tenant-scoped reads require an
 * `organizationId`; `findByEmail`/`existsByEmail` are global because staff
 * email is unique platform-wide and login has no tenant hint yet.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(organizationId: string, id: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  /** Active staff users of an organization (notification recipients). */
  listActiveByOrganization(organizationId: string): Promise<User[]>;
  /** All staff users of an organization (any status), for team management. */
  listByOrganization(organizationId: string): Promise<User[]>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
