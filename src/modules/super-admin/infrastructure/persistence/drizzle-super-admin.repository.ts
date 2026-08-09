import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { SuperAdmin } from '../../domain/entities/super-admin.entity';
import type { SuperAdminRepository } from '../../domain/repositories/super-admin.repository';
import { superAdmins, type SuperAdminRow } from './super-admin.schema';

@Injectable()
export class DrizzleSuperAdminRepository
  extends BaseDrizzleRepository
  implements SuperAdminRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    const rows = await this.executor
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findById(id: string): Promise<SuperAdmin | null> {
    const rows = await this.executor
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.id, id))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async save(superAdmin: SuperAdmin): Promise<void> {
    await this.executor
      .insert(superAdmins)
      .values({
        id: superAdmin.id,
        email: superAdmin.email,
        passwordHash: superAdmin.passwordHash,
        lastLoginAt: superAdmin.lastLoginAt,
        createdAt: superAdmin.createdAt,
        updatedAt: superAdmin.updatedAt,
      })
      .onConflictDoUpdate({
        target: superAdmins.id,
        set: {
          passwordHash: superAdmin.passwordHash,
          lastLoginAt: superAdmin.lastLoginAt,
          updatedAt: superAdmin.updatedAt,
        },
      });
  }
}

function toDomain(row: SuperAdminRow): SuperAdmin {
  return SuperAdmin.fromPersistence(row.id, {
    email: row.email,
    passwordHash: row.passwordHash,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
