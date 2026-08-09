import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { ServiceOption } from '../../domain/entities/service-option.entity';
import type { ServiceOptionRepository } from '../../domain/repositories/service-option.repository';
import { ServiceOptionMapper } from '../mappers/service-option.mapper';
import { serviceOptions } from './service.schema';

@Injectable()
export class DrizzleServiceOptionRepository
  extends BaseDrizzleRepository
  implements ServiceOptionRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findById(organizationId: string, id: string): Promise<ServiceOption | null> {
    const rows = await this.executor
      .select()
      .from(serviceOptions)
      .where(and(eq(serviceOptions.organizationId, organizationId), eq(serviceOptions.id, id)))
      .limit(1);
    return rows[0] ? ServiceOptionMapper.toDomain(rows[0]) : null;
  }

  async listByService(organizationId: string, serviceId: string): Promise<ServiceOption[]> {
    const rows = await this.executor
      .select()
      .from(serviceOptions)
      .where(
        and(
          eq(serviceOptions.organizationId, organizationId),
          eq(serviceOptions.serviceId, serviceId),
        ),
      )
      .orderBy(asc(serviceOptions.durationMinutes));
    return rows.map((row) => ServiceOptionMapper.toDomain(row));
  }

  async countActiveByService(organizationId: string, serviceId: string): Promise<number> {
    const rows = await this.executor
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceOptions)
      .where(
        and(
          eq(serviceOptions.organizationId, organizationId),
          eq(serviceOptions.serviceId, serviceId),
          eq(serviceOptions.active, true),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  async save(option: ServiceOption): Promise<void> {
    const row = ServiceOptionMapper.toRow(option);
    await this.executor
      .insert(serviceOptions)
      .values(row)
      .onConflictDoUpdate({
        target: serviceOptions.id,
        set: {
          durationMinutes: row.durationMinutes,
          price: row.price,
          active: row.active,
          updatedAt: row.updatedAt,
        },
      });
  }
}
