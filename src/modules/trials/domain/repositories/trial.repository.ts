import type { Trial } from '../entities/trial.entity';

/** Persistence contract for {@link Trial} (tenant-scoped). */
export interface TrialRepository {
  findCurrentByOrganization(organizationId: string): Promise<Trial | null>;
  save(trial: Trial): Promise<void>;
}

export const TRIAL_REPOSITORY = Symbol('TRIAL_REPOSITORY');
