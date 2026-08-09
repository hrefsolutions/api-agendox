import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { ResourceScheduleRepository } from '../../domain/repositories';
import type { ResourceScheduleEntry } from '../../domain/types';
import { resourceSchedules } from './resource.schema';

@Injectable()
export class DrizzleResourceScheduleRepository
  extends BaseDrizzleRepository
  implements ResourceScheduleRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async getByResource(
    organizationId: string,
    resourceId: string,
  ): Promise<ResourceScheduleEntry[]> {
    const rows = await this.executor
      .select()
      .from(resourceSchedules)
      .where(
        and(
          eq(resourceSchedules.organizationId, organizationId),
          eq(resourceSchedules.resourceId, resourceId),
        ),
      )
      .orderBy(asc(resourceSchedules.dayOfWeek), asc(resourceSchedules.startsAt));
    return rows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      validFrom: row.validFrom,
      validTo: row.validTo,
    }));
  }

  async replaceForResource(
    organizationId: string,
    resourceId: string,
    entries: ResourceScheduleEntry[],
  ): Promise<void> {
    await this.executor
      .delete(resourceSchedules)
      .where(
        and(
          eq(resourceSchedules.organizationId, organizationId),
          eq(resourceSchedules.resourceId, resourceId),
        ),
      );
    if (entries.length === 0) return;
    await this.executor.insert(resourceSchedules).values(
      entries.map((entry) => ({
        id: randomUUID(),
        organizationId,
        resourceId,
        dayOfWeek: entry.dayOfWeek,
        startsAt: entry.startsAt,
        endsAt: entry.endsAt,
        validFrom: entry.validFrom,
        validTo: entry.validTo,
      })),
    );
  }
}
