import type { RecipientType } from './recipient-type.enum';

export interface PushSubscriptionInput {
  organizationId: string;
  recipientType: RecipientType;
  recipientId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRepository {
  upsert(input: PushSubscriptionInput, now: Date): Promise<void>;
  listActiveByRecipient(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<StoredPushSubscription[]>;
  markRevoked(endpoint: string, at: Date): Promise<void>;
  deleteByEndpoint(organizationId: string, endpoint: string): Promise<void>;
}

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');
