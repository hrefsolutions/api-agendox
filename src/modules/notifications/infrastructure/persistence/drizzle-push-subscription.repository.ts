import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type {
  PushSubscriptionInput,
  PushSubscriptionRepository,
  StoredPushSubscription,
} from '../../domain/push-subscription.repository';
import { RecipientType } from '../../domain/recipient-type.enum';
import { pushSubscriptions } from './notification.schema';

@Injectable()
export class DrizzlePushSubscriptionRepository
  extends BaseDrizzleRepository
  implements PushSubscriptionRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async upsert(input: PushSubscriptionInput, now: Date): Promise<void> {
    await this.executor
      .insert(pushSubscriptions)
      .values({
        id: randomUUID(),
        organizationId: input.organizationId,
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        createdAt: now,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          organizationId: input.organizationId,
          recipientType: input.recipientType,
          recipientId: input.recipientId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
          lastUsedAt: now,
          revokedAt: null,
        },
      });
  }

  async listActiveByRecipient(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<StoredPushSubscription[]> {
    const rows = await this.executor
      .select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.organizationId, organizationId),
          eq(pushSubscriptions.recipientType, recipientType),
          eq(pushSubscriptions.recipientId, recipientId),
          isNull(pushSubscriptions.revokedAt),
        ),
      );
    return rows;
  }

  async markRevoked(endpoint: string, at: Date): Promise<void> {
    await this.executor
      .update(pushSubscriptions)
      .set({ revokedAt: at })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deleteByEndpoint(organizationId: string, endpoint: string): Promise<void> {
    await this.executor
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.organizationId, organizationId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }
}
