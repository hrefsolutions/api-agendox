import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { users } from './user.schema';

@Injectable()
export class DrizzleUserRepository extends BaseDrizzleRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.executor
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? UserMapper.toDomain(rows[0]) : null;
  }

  async findById(organizationId: string, id: string): Promise<User | null> {
    const rows = await this.executor
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.id, id)))
      .limit(1);
    return rows[0] ? UserMapper.toDomain(rows[0]) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows.length > 0;
  }

  async listActiveByOrganization(organizationId: string): Promise<User[]> {
    const rows = await this.executor
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.status, 'ACTIVE')));
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async listByOrganization(organizationId: string): Promise<User[]> {
    const rows = await this.executor
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);
    await this.executor
      .insert(users)
      .values(row)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          passwordHash: row.passwordHash,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          status: row.status,
          lastLoginAt: row.lastLoginAt,
          updatedAt: row.updatedAt,
        },
      });
  }
}
