import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PaymentConfig } from '@config/configuration';
import { CLOCK, type Clock } from '@shared/application';
import { BusinessRuleError, NotFoundError } from '@shared/errors';

import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';

import { Subscription } from '../domain/entities/subscription.entity';
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';
import { PAYMENT_GATEWAY, type PaymentGateway } from './ports/payment-gateway.port';

export interface CheckoutView {
  /** Hosted checkout URL to redirect the payer to. */
  initPoint: string;
}

/**
 * Starts a subscription checkout: persists a PENDING subscription and creates
 * the gateway preapproval, returning the hosted checkout URL. Access is granted
 * only later, when the gateway confirms authorization via webhook.
 */
@Injectable()
export class StartSubscriptionCheckout {
  private readonly payment: PaymentConfig;

  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    configService: ConfigService,
  ) {
    this.payment = configService.getOrThrow<PaymentConfig>('payment');
  }

  async execute(
    organizationId: string,
    planId: string,
    payerEmail: string,
  ): Promise<CheckoutView> {
    const plan = await this.plans.findById(planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Plan no encontrado o inactivo');
    }
    assertPayableEmail(payerEmail);

    const now = this.clock.now();
    const subscription = Subscription.startCheckout({ organizationId, planId, now });

    const checkout = await this.gateway.createSubscription({
      subscriptionId: subscription.id,
      organizationId,
      planName: plan.name,
      amountCents: plan.price.cents,
      currency: plan.currency,
      frequencyMonths: plan.periodMonths,
      payerEmail,
      backUrl: `${this.payment.dashboardUrl}/subscription?status=success`,
      notificationUrl: `${this.payment.apiPublicUrl}/api/v1/subscription/webhook`,
    });

    subscription.attachProvider(checkout.providerSubscriptionId, now);
    await this.subscriptions.save(subscription);

    return { initPoint: checkout.initPoint };
  }
}

/**
 * TLDs reservados por la RFC 2606 / RFC 6761: no resuelven en internet, así que
 * la pasarela rechaza el pagador. Aparecen sobre todo en cuentas de seed y de
 * demo (`owner@demo.test`), y el error que devuelve el proveedor no dice nada
 * sobre el email — conviene cortarlo acá con un mensaje que sí lo diga.
 */
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost', 'local'];

function assertPayableEmail(email: string): void {
  const domain = email.trim().toLowerCase().split('@')[1];
  const tld = domain?.split('.').pop();
  if (!domain || !tld) {
    throw new BusinessRuleError('El email de la cuenta no es válido para facturar.');
  }
  if (RESERVED_TLDS.includes(tld)) {
    throw new BusinessRuleError(
      `La cuenta usa el email "${email}", cuyo dominio no existe en internet y la pasarela de pago rechaza. ` +
        'Cambiá el email del usuario por uno real antes de suscribir el negocio.',
    );
  }
}
