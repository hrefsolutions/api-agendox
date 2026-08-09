import type {
  CheckoutResult,
  CreateSubscriptionInput,
  PaymentGateway,
  ProviderSubscriptionStatus,
  SubscriptionWebhookEvent,
  WebhookRequest,
} from '../application/ports/payment-gateway.port';

/**
 * Dev/test payment gateway. No external calls: the checkout "init point" is a
 * local API route (`GET /subscription/mock/authorize`) that simulates the
 * payer authorizing, so the whole subscribe flow works end-to-end without
 * Mercado Pago credentials. Webhooks can be simulated by POSTing a JSON body
 * to `/subscription/webhook`.
 */
export class MockPaymentGateway implements PaymentGateway {
  constructor(private readonly apiPublicUrl: string) {}

  createSubscription(input: CreateSubscriptionInput): Promise<CheckoutResult> {
    const providerSubscriptionId = `mock_${input.subscriptionId}`;
    const initPoint = `${this.apiPublicUrl}/api/v1/subscription/mock/authorize?sub=${input.subscriptionId}`;
    return Promise.resolve({ providerSubscriptionId, initPoint });
  }

  cancelSubscription(): Promise<void> {
    return Promise.resolve();
  }

  parseWebhook(request: WebhookRequest): Promise<SubscriptionWebhookEvent | null> {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const providerSubscriptionId = typeof body.providerSubscriptionId === 'string'
      ? body.providerSubscriptionId
      : null;
    const status = body.status as ProviderSubscriptionStatus | undefined;
    if (!providerSubscriptionId || !status) return Promise.resolve(null);
    return Promise.resolve({
      providerSubscriptionId,
      status,
      paymentApproved: body.paymentApproved === true,
      paymentRejected: body.paymentRejected === true,
    });
  }
}
