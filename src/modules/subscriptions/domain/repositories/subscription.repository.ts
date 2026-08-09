import type { Subscription } from '../entities/subscription.entity';

export interface SubscriptionRepository {
  /** Most recent subscription for the organization (any status). */
  findCurrentByOrganization(organizationId: string): Promise<Subscription | null>;
  /** Most recent ACTIVE subscription for the organization. */
  findActiveByOrganization(organizationId: string): Promise<Subscription | null>;
  /** Lookup by the payment gateway's subscription id (for webhooks). */
  findByProviderSubscriptionId(providerSubscriptionId: string): Promise<Subscription | null>;
  /** ACTIVE/PAST_DUE subscriptions whose period ended before `before`. */
  findExpired(before: Date, limit: number): Promise<Subscription[]>;
  save(subscription: Subscription): Promise<void>;
}

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
