import { Money } from '@shared/domain';

import { Plan } from '../../domain/entities/plan.entity';
import { BillingPeriod, PlanStatus } from '../../domain/plan-status.enum';
import type { NewPlanRow, PlanRow } from '../persistence/plan.schema';

export class PlanMapper {
  static toDomain(row: PlanRow): Plan {
    return Plan.fromPersistence(row.id, {
      name: row.name,
      price: Money.fromDecimalString(row.price),
      currency: row.currency,
      billingPeriod: row.billingPeriod as BillingPeriod,
      features: row.features,
      limits: row.limits,
      status: row.status as PlanStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(plan: Plan): NewPlanRow {
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price.toDecimalString(),
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      features: plan.features,
      limits: plan.limits,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
