import { Module } from '@nestjs/common';

import { TRIAL_REPOSITORY } from './domain/repositories/trial.repository';
import { DrizzleTrialRepository } from './infrastructure/persistence/drizzle-trial.repository';

/**
 * Trials module (MVP minimum). Exposes {@link TRIAL_REPOSITORY} so organization
 * registration can start a trial; expiry/conversion arrive with M9.
 */
@Module({
  providers: [{ provide: TRIAL_REPOSITORY, useClass: DrizzleTrialRepository }],
  exports: [TRIAL_REPOSITORY],
})
export class TrialsModule {}
