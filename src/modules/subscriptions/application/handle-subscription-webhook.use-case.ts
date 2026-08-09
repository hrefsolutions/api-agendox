import { Inject, Injectable } from '@nestjs/common';

import { PAYMENT_GATEWAY, type PaymentGateway, type WebhookRequest } from './ports/payment-gateway.port';
import { SyncSubscriptionFromProvider } from './sync-subscription-from-provider.use-case';

/**
 * Entry point for gateway webhooks. Delegates verification + resolution to the
 * gateway adapter (which validates the signature and fetches authoritative
 * state), then applies the normalized event. Irrelevant events are no-ops.
 */
@Injectable()
export class HandleSubscriptionWebhook {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly sync: SyncSubscriptionFromProvider,
  ) {}

  async execute(request: WebhookRequest): Promise<void> {
    const event = await this.gateway.parseWebhook(request);
    if (!event) return;
    await this.sync.apply(event);
  }
}
