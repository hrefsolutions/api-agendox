import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';

import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';
import type { SubscriptionWebhookEvent } from './ports/payment-gateway.port';

/**
 * Applies a normalized gateway event to our subscription. Single source of the
 * status mapping, shared by the webhook handler and the mock authorize route.
 * Looks the subscription up by the gateway's id; unknown ids are ignored.
 */
@Injectable()
export class SyncSubscriptionFromProvider {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async apply(event: SubscriptionWebhookEvent): Promise<void> {
    const subscription = await this.subscriptions.findByProviderSubscriptionId(
      event.providerSubscriptionId,
    );
    if (!subscription) return;

    const now = this.clock.now();
    if (event.status === 'CANCELLED') {
      subscription.cancel(now);
    } else if (event.status === 'PAUSED') {
      subscription.suspend(now);
    } else if (event.paymentRejected) {
      subscription.markPastDue(now);
    } else if (event.status === 'AUTHORIZED' || event.paymentApproved) {
      const plan = await this.plans.findById(subscription.planId);
      const months = plan?.periodMonths ?? 1;
      subscription.activateForPeriod(addMonths(now, months), now);
    } else {
      // PENDING or nothing actionable — leave as is.
      return;
    }
    await this.subscriptions.save(subscription);
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
