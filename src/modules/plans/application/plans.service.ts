import { Inject, Injectable } from '@nestjs/common';

import type { Plan } from '../domain/entities/plan.entity';
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/repositories/plan.repository';

export interface PlanView {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
}

@Injectable()
export class PlansService {
  constructor(@Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository) {}

  async listActive(): Promise<PlanView[]> {
    const all = await this.plans.listActive();
    return all.map(toView);
  }
}

function toView(plan: Plan): PlanView {
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price.toNumber(),
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    features: plan.features,
    limits: plan.limits,
  };
}
