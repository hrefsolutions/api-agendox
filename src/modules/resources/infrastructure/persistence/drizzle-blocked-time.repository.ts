import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { BlockedTimeType } from '../../domain/blocked-time-type.enum';
import type { BlockedTimeRepository } from '../../domain/repositories';
import type { BlockedTime } from '../../domain/types';
import { blockedTimes } from './resource.schema';
import type { BlockedTimeRow } from './resource.schema';

@Injectable()
export class DrizzleBlockedTimeRepository
  extends BaseDrizzleRepository
  implements BlockedTimeRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(organizationId: string, blockedTime: BlockedTime): Promise<void> {
    await this.executor
      .insert(blockedTimes)
      .values({
        id: blockedTime.id,
        organizationId,
        resourceId: blockedTime.resourceId,
        startsAt: blockedTime.startsAt,
        endsAt: blockedTime.endsAt,
        reason: blockedTime.reason,
        type: blockedTime.type,
        createdByUserId: blockedTime.createdByUserId,
        createdAt: blockedTime.createdAt,
      })
      .onConflictDoUpdate({
        target: blockedTimes.id,
        set: {
          resourceId: blockedTime.resourceId,
          startsAt: blockedTime.startsAt,
          endsAt: blockedTime.endsAt,
          reason: blockedTime.reason,
          type: blockedTime.type,
        },
      });
  }

  async findById(organizationId: string, id: string): Promise<BlockedTime | null> {
    const rows = await this.executor
      .select()
      .from(blockedTimes)
      .where(and(eq(blockedTimes.organizationId, organizationId), eq(blockedTimes.id, id)))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async list(organizationId: string): Promise<BlockedTime[]> {
    const rows = await this.executor
      .select()
      .from(blockedTimes)
      .where(eq(blockedTimes.organizationId, organizationId))
      .orderBy(asc(blockedTimes.startsAt));
    return rows.map(toDomain);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.executor
      .delete(blockedTimes)
      .where(and(eq(blockedTimes.organizationId, organizationId), eq(blockedTimes.id, id)));
  }
}

function toDomain(row: BlockedTimeRow): BlockedTime {
  return {
    id: row.id,
    resourceId: row.resourceId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reason: row.reason,
    type: row.type as BlockedTimeType,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}
