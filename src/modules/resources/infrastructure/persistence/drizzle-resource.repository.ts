import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Resource } from '../../domain/entities/resource.entity';
import type { ResourceRepository } from '../../domain/repositories';
import { ResourceMapper } from '../mappers/resource.mapper';
import { resources } from './resource.schema';

@Injectable()
export class DrizzleResourceRepository extends BaseDrizzleRepository implements ResourceRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findById(organizationId: string, id: string): Promise<Resource | null> {
    const rows = await this.executor
      .select()
      .from(resources)
      .where(and(eq(resources.organizationId, organizationId), eq(resources.id, id)))
      .limit(1);
    return rows[0] ? ResourceMapper.toDomain(rows[0]) : null;
  }

  async existsActive(organizationId: string, id: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: resources.id })
      .from(resources)
      .where(
        and(
          eq(resources.organizationId, organizationId),
          eq(resources.id, id),
          eq(resources.active, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async lockActive(organizationId: string, id: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: resources.id })
      .from(resources)
      .where(
        and(
          eq(resources.organizationId, organizationId),
          eq(resources.id, id),
          eq(resources.active, true),
        ),
      )
      .for('update')
      .limit(1);
    return rows.length > 0;
  }

  async list(organizationId: string): Promise<Resource[]> {
    const rows = await this.executor
      .select()
      .from(resources)
      .where(eq(resources.organizationId, organizationId))
      .orderBy(asc(resources.name));
    return rows.map((row) => ResourceMapper.toDomain(row));
  }

  async save(resource: Resource): Promise<void> {
    const row = ResourceMapper.toRow(resource);
    await this.executor
      .insert(resources)
      .values(row)
      .onConflictDoUpdate({
        target: resources.id,
        set: {
          userId: row.userId,
          name: row.name,
          type: row.type,
          color: row.color,
          active: row.active,
          description: row.description,
          updatedAt: row.updatedAt,
        },
      });
  }
}
