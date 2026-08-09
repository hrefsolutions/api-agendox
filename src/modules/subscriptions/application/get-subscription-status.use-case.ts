import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';
import {
  TRIAL_REPOSITORY,
  type TrialRepository,
} from '@modules/trials/domain/repositories/trial.repository';

import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';
import { OrganizationAccessService } from './organization-access.service';
import type { SubscriptionStatusView } from './subscription.dto';

/** Access/plan status for the tenant panel (trial + subscription + can-operate). */
@Injectable()
export class GetSubscriptionStatus {
  constructor(
    @Inject(TRIAL_REPOSITORY) private readonly trials: TrialRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    private readonly access: OrganizationAccessService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(organizationId: string): Promise<SubscriptionStatusView> {
    const now = this.clock.now();
    const trial = await this.trials.findCurrentByOrganization(organizationId);
    const subscription = await this.subscriptions.findCurrentByOrganization(organizationId);

    let subscriptionView: SubscriptionStatusView['subscription'] = null;
    if (subscription) {
      const plan = await this.plans.findById(subscription.planId);
      subscriptionView = {
        status: subscription.status,
        planId: subscription.planId,
        planName: plan?.name ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }

    return {
      canOperate: await this.access.canOperate(organizationId),
      trial: trial ? { active: trial.isActiveAt(now), endsAt: trial.endsAt } : null,
      subscription: subscriptionView,
    };
  }
}
