import { Module } from '@nestjs/common';

import { PlansService } from './application/plans.service';
import { PLAN_REPOSITORY } from './domain/repositories/plan.repository';
import { PlansController } from './interface/http/plans.controller';
import { DrizzlePlanRepository } from './infrastructure/persistence/drizzle-plan.repository';

/**
 * Plans module (M9). Global commercial plans. Exports {@link PLAN_REPOSITORY}
 * so subscriptions can validate/activate against a plan and the seed can create
 * defaults.
 */
@Module({
  controllers: [PlansController],
  providers: [{ provide: PLAN_REPOSITORY, useClass: DrizzlePlanRepository }, PlansService],
  exports: [PLAN_REPOSITORY],
})
export class PlansModule {}
