import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Trial } from '../../domain/entities/trial.entity';
import type { TrialRepository } from '../../domain/repositories/trial.repository';
import { TrialMapper } from '../mappers/trial.mapper';
import { trials } from './trial.schema';

@Injectable()
export class DrizzleTrialRepository extends BaseDrizzleRepository implements TrialRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findCurrentByOrganization(organizationId: string): Promise<Trial | null> {
    const rows = await this.executor
      .select()
      .from(trials)
      .where(eq(trials.organizationId, organizationId))
      .orderBy(desc(trials.createdAt))
      .limit(1);
    return rows[0] ? TrialMapper.toDomain(rows[0]) : null;
  }

  async save(trial: Trial): Promise<void> {
    const row = TrialMapper.toRow(trial);
    await this.executor
      .insert(trials)
      .values(row)
      .onConflictDoUpdate({
        target: trials.id,
        set: { status: row.status, convertedAt: row.convertedAt },
      });
  }
}
