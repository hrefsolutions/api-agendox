import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Organization } from '../../domain/entities/organization.entity';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { OrganizationMapper } from '../mappers/organization.mapper';
import { organizations } from './organization.schema';

@Injectable()
export class DrizzleOrganizationRepository
  extends BaseDrizzleRepository
  implements OrganizationRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findById(id: string): Promise<Organization | null> {
    const rows = await this.executor
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return rows[0] ? OrganizationMapper.toDomain(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const rows = await this.executor
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? OrganizationMapper.toDomain(rows[0]) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug.trim().toLowerCase()))
      .limit(1);
    return rows.length > 0;
  }

  async save(organization: Organization): Promise<void> {
    const row = OrganizationMapper.toRow(organization);
    await this.executor
      .insert(organizations)
      .values(row)
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: row.name,
          status: row.status,
          timezone: row.timezone,
          updatedAt: row.updatedAt,
        },
      });
  }
}
