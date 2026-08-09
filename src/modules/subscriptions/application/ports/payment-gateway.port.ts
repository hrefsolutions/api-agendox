/** Normalized state of a subscription at the payment gateway. */
export type ProviderSubscriptionStatus = 'PENDING' | 'AUTHORIZED' | 'PAUSED' | 'CANCELLED';

export interface CreateSubscriptionInput {
  /** Our internal subscription id, sent as the provider's external reference. */
  subscriptionId: string;
  organizationId: string;
  planName: string;
  amountCents: number;
  currency: string;
  /** Billing period length in months (1 monthly, 12 yearly). */
  frequencyMonths: number;
  payerEmail: string;
  /** Where the gateway returns the payer after authorizing. */
  backUrl: string;
  /** Where the gateway posts webhooks for this subscription. */
  notificationUrl: string;
}

export interface CheckoutResult {
  /** The gateway's subscription id (persisted on our subscription). */
  providerSubscriptionId: string;
  /** Hosted checkout URL to redirect the payer to. */
  initPoint: string;
}

/**
 * A verified, normalized webhook event. `paymentApproved`/`paymentRejected`
 * carry the outcome of a recurring charge; `status` carries the subscription's
 * authoritative state after the event was resolved against the gateway.
 */
export interface SubscriptionWebhookEvent {
  providerSubscriptionId: string;
  status: ProviderSubscriptionStatus;
  paymentApproved?: boolean;
  paymentRejected?: boolean;
}

/** Raw inputs a webhook handler needs to verify + resolve an event. */
export interface WebhookRequest {
  headers: Record<string, string | undefined>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * Payment gateway for recurring SaaS subscriptions. Implemented by a Mercado
 * Pago adapter (preapproval API) and a mock for dev/tests. Selected by
 * `PAYMENT_PROVIDER`.
 */
export interface PaymentGateway {
  createSubscription(input: CreateSubscriptionInput): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  /**
   * Verifies the request's authenticity and resolves it to a normalized event.
   * Returns null for irrelevant/unrecognized notifications. Throws if the
   * signature is present but invalid.
   */
  parseWebhook(request: WebhookRequest): Promise<SubscriptionWebhookEvent | null>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
