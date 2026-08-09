import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Plan } from '../../domain/entities/plan.entity';
import type { PlanRepository } from '../../domain/repositories/plan.repository';
import { PlanMapper } from '../mappers/plan.mapper';
import { plans } from './plan.schema';

@Injectable()
export class DrizzlePlanRepository extends BaseDrizzleRepository implements PlanRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async listActive(): Promise<Plan[]> {
    const rows = await this.executor
      .select()
      .from(plans)
      .where(eq(plans.status, 'ACTIVE'))
      .orderBy(asc(plans.price));
    return rows.map((row) => PlanMapper.toDomain(row));
  }

  async findById(id: string): Promise<Plan | null> {
    const rows = await this.executor.select().from(plans).where(eq(plans.id, id)).limit(1);
    return rows[0] ? PlanMapper.toDomain(rows[0]) : null;
  }

  async findByName(name: string): Promise<Plan | null> {
    const rows = await this.executor
      .select()
      .from(plans)
      .where(eq(plans.name, name.trim()))
      .limit(1);
    return rows[0] ? PlanMapper.toDomain(rows[0]) : null;
  }

  async save(plan: Plan): Promise<void> {
    const row = PlanMapper.toRow(plan);
    await this.executor
      .insert(plans)
      .values(row)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          price: row.price,
          currency: row.currency,
          billingPeriod: row.billingPeriod,
          features: row.features,
          limits: row.limits,
          status: row.status,
          updatedAt: row.updatedAt,
        },
      });
  }
}
