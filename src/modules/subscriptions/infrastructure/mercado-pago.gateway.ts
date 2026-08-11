import { createHmac, timingSafeEqual } from 'node:crypto';

import { Logger } from 'nestjs-pino';

import { BusinessRuleError, UnauthorizedError } from '@shared/errors';

import type {
  CheckoutResult,
  CreateSubscriptionInput,
  PaymentGateway,
  ProviderSubscriptionStatus,
  SubscriptionWebhookEvent,
  WebhookRequest,
} from '../application/ports/payment-gateway.port';

const MP_API = 'https://api.mercadopago.com';

/**
 * Mercado Pago gateway using the **preapproval** (recurring subscription) API
 * over REST (no SDK). The payer authorizes once at `init_point`; MP then charges
 * each period and posts webhooks, which we verify (HMAC) and resolve against the
 * API before mutating our subscription.
 */
export class MercadoPagoGateway implements PaymentGateway {
  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
    private readonly logger: Logger,
  ) {}

  async createSubscription(input: CreateSubscriptionInput): Promise<CheckoutResult> {
    const res = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        reason: `Agendox — ${input.planName}`,
        external_reference: input.subscriptionId,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        notification_url: input.notificationUrl,
        status: 'pending',
        auto_recurring: {
          frequency: input.frequencyMonths,
          frequency_type: 'months',
          transaction_amount: round2(input.amountCents / 100),
          currency_id: input.currency,
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as MpErrorBody & {
      id?: string;
      init_point?: string;
    };
    if (!res.ok || !data.id || !data.init_point) {
      this.logger.error(
        { status: res.status, data, backUrl: input.backUrl, payerEmail: input.payerEmail },
        'Mercado Pago preapproval failed',
      );
      // El detalle de MP dice exactamente qué campo rechazó (un back_url que no
      // es HTTPS pública, un payer_email inválido o igual al de la cuenta
      // cobradora, un monto por debajo del mínimo). Tragárselo obliga a leer los
      // logs del servidor para diagnosticar algo que el usuario ya está viendo.
      throw new BusinessRuleError(
        `No se pudo iniciar el checkout de pago: ${describeMpError(res.status, data)}`,
      );
    }
    return { providerSubscriptionId: data.id, initPoint: data.init_point };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const res = await fetch(`${MP_API}/preapproval/${providerSubscriptionId}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!res.ok) {
      this.logger.error(
        { status: res.status, providerSubscriptionId },
        'Mercado Pago cancel failed',
      );
      throw new BusinessRuleError('No se pudo cancelar la suscripción en la pasarela');
    }
  }

  async parseWebhook(request: WebhookRequest): Promise<SubscriptionWebhookEvent | null> {
    const dataId = pickString(request.query['data.id']) ?? pickDataId(request.body);
    if (!dataId) return null;

    this.verifySignature(request.headers, dataId);

    const type =
      pickString(request.query.type) ??
      pickString(request.query.topic) ??
      pickType(request.body);

    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const status = await this.fetchPreapprovalStatus(dataId);
      if (!status) return null;
      return { providerSubscriptionId: dataId, status, paymentApproved: status === 'AUTHORIZED' };
    }

    if (type === 'subscription_authorized_payment') {
      const payment = await this.fetchAuthorizedPayment(dataId);
      if (!payment) return null;
      return {
        providerSubscriptionId: payment.preapprovalId,
        status: 'AUTHORIZED',
        paymentApproved: payment.status === 'approved',
        paymentRejected: payment.status === 'rejected',
      };
    }

    // Unrelated notification (e.g. a plain payment) — nothing to do.
    return null;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verifies the `x-signature` HMAC over the manifest
   * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Rejects missing or
   * mismatched signatures — the webhook grants paid access, so it must be authentic.
   */
  private verifySignature(headers: Record<string, string | undefined>, dataId: string): void {
    const signature = headers['x-signature'];
    const requestId = headers['x-request-id'];
    if (!signature) {
      throw new UnauthorizedError('Falta la firma del webhook');
    }
    const parts = Object.fromEntries(
      signature.split(',').map((kv) => kv.split('=').map((s) => s.trim()) as [string, string]),
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) {
      throw new UnauthorizedError('Firma del webhook malformada');
    }
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedError('Firma del webhook inválida');
    }
  }

  private async fetchPreapprovalStatus(id: string): Promise<ProviderSubscriptionStatus | null> {
    const res = await fetch(`${MP_API}/preapproval/${id}`, { headers: this.authHeaders() });
    if (!res.ok) {
      this.logger.error({ status: res.status, id }, 'Mercado Pago get preapproval failed');
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return mapPreapprovalStatus(data.status);
  }

  private async fetchAuthorizedPayment(
    id: string,
  ): Promise<{ preapprovalId: string; status: string } | null> {
    const res = await fetch(`${MP_API}/authorized_payments/${id}`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      this.logger.error({ status: res.status, id }, 'Mercado Pago get authorized payment failed');
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as {
      preapproval_id?: string;
      status?: string;
      payment?: { status?: string };
    };
    if (!data.preapproval_id) return null;
    return { preapprovalId: data.preapproval_id, status: data.payment?.status ?? data.status ?? '' };
  }
}

/** Forma de los errores de la API de Mercado Pago (varía según el endpoint). */
interface MpErrorBody {
  message?: string;
  error?: string;
  cause?: Array<{ code?: string | number; description?: string }> | string;
}

/**
 * Arma un mensaje legible con lo que devolvió Mercado Pago. Prioriza `cause`,
 * que es donde viaja el detalle útil; cae al `message` y, si no hay nada, al
 * código HTTP con una pista de qué suele significar.
 */
function describeMpError(status: number, body: MpErrorBody): string {
  const causes = Array.isArray(body.cause)
    ? body.cause
        .map((c) => c.description ?? (c.code !== undefined ? String(c.code) : ''))
        .filter(Boolean)
    : typeof body.cause === 'string' && body.cause
      ? [body.cause]
      : [];

  if (causes.length > 0) return causes.join('; ');
  if (body.message) return body.message;
  if (body.error) return body.error;

  if (status === 401 || status === 403) {
    return 'la pasarela rechazó las credenciales (revisá MP_ACCESS_TOKEN)';
  }
  if (status === 400) {
    return 'la pasarela rechazó los datos del checkout (revisá APP_DASHBOARD_URL y el email del pagador)';
  }
  return `la pasarela respondió ${status}`;
}

function mapPreapprovalStatus(status: string | undefined): ProviderSubscriptionStatus | null {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'authorized':
      return 'AUTHORIZED';
    case 'paused':
      return 'PAUSED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function pickDataId(body: unknown): string | undefined {
  const data = (body as { data?: { id?: unknown } } | undefined)?.data;
  return pickString(data?.id);
}

function pickType(body: unknown): string | undefined {
  return pickString((body as { type?: unknown } | undefined)?.type);
}
