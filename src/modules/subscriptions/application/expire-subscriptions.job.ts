import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';

import { CLOCK, type Clock } from '@shared/application';

import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';

const BATCH_SIZE = 100;

/**
 * Marks ACTIVE/PAST_DUE subscriptions EXPIRED once their period has elapsed
 * without a renewal (the gateway normally renews via webhook; this is the
 * safety net). Idempotent per row; single-instance for the MVP.
 */
@Injectable()
export class ExpireSubscriptionsJob {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const now = this.clock.now();
    const expired = await this.subscriptions.findExpired(now, BATCH_SIZE);
    if (expired.length === 0) return;
    for (const subscription of expired) {
      subscription.expire(now);
      await this.subscriptions.save(subscription);
    }
    this.logger.log(`Expired ${expired.length} subscription(s)`);
  }
}
