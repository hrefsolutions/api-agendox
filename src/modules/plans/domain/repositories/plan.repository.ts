import type { Plan } from '../entities/plan.entity';

/** Plans are global (not tenant-scoped). */
export interface PlanRepository {
  listActive(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
  findByName(name: string): Promise<Plan | null>;
  save(plan: Plan): Promise<void>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
