import type { SuperAdmin } from '../entities/super-admin.entity';

export interface SuperAdminRepository {
  findByEmail(email: string): Promise<SuperAdmin | null>;
  findById(id: string): Promise<SuperAdmin | null>;
  save(superAdmin: SuperAdmin): Promise<void>;
}

export const SUPER_ADMIN_REPOSITORY = Symbol('SUPER_ADMIN_REPOSITORY');
