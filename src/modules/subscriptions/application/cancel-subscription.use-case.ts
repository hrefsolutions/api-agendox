import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { NotFoundError } from '@shared/errors';

import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';
import { PAYMENT_GATEWAY, type PaymentGateway } from './ports/payment-gateway.port';

/**
 * Cancels the tenant's current subscription: tells the gateway to stop future
 * charges, then marks it CANCELLED. Access continues until the period end via
 * {@link Subscription.isActiveAt} — cancellation is not a refund.
 */
@Injectable()
export class CancelSubscription {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(organizationId: string): Promise<void> {
    const subscription = await this.subscriptions.findCurrentByOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundError('No hay una suscripción para cancelar');
    }
    if (subscription.providerSubscriptionId) {
      await this.gateway.cancelSubscription(subscription.providerSubscriptionId);
    }
    subscription.cancel(this.clock.now());
    await this.subscriptions.save(subscription);
  }
}
