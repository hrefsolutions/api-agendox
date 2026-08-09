import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PushConfig } from '@config/configuration';
import { CLOCK, type Clock } from '@shared/application';

import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../domain/push-subscription.repository';
import type { RecipientType } from '../domain/recipient-type.enum';

export interface SubscribeInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

/** Manages Web Push subscriptions for a recipient (staff or customer). */
@Injectable()
export class PushService {
  private readonly vapidPublicKey: string;

  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    configService: ConfigService,
  ) {
    this.vapidPublicKey = configService.getOrThrow<PushConfig>('push').vapidPublicKey;
  }

  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.vapidPublicKey };
  }

  subscribe(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    input: SubscribeInput,
  ): Promise<void> {
    return this.subscriptions.upsert(
      {
        organizationId,
        recipientType,
        recipientId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      this.clock.now(),
    );
  }

  unsubscribe(organizationId: string, endpoint: string): Promise<void> {
    return this.subscriptions.deleteByEndpoint(organizationId, endpoint);
  }
}
