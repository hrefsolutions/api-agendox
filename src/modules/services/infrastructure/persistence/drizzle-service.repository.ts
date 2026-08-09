import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Service } from '../../domain/entities/service.entity';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { ServiceMapper } from '../mappers/service.mapper';
import { services } from './service.schema';

@Injectable()
export class DrizzleServiceRepository extends BaseDrizzleRepository implements ServiceRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findById(organizationId: string, id: string): Promise<Service | null> {
    const rows = await this.executor
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.id, id)))
      .limit(1);
    return rows[0] ? ServiceMapper.toDomain(rows[0]) : null;
  }

  async existsActive(organizationId: string, id: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.organizationId, organizationId),
          eq(services.id, id),
          eq(services.active, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async list(organizationId: string): Promise<Service[]> {
    const rows = await this.executor
      .select()
      .from(services)
      .where(eq(services.organizationId, organizationId))
      .orderBy(asc(services.name));
    return rows.map((row) => ServiceMapper.toDomain(row));
  }

  async save(service: Service): Promise<void> {
    const row = ServiceMapper.toRow(service);
    await this.executor
      .insert(services)
      .values(row)
      .onConflictDoUpdate({
        target: services.id,
        set: {
          name: row.name,
          description: row.description,
          active: row.active,
          updatedAt: row.updatedAt,
        },
      });
  }
}
