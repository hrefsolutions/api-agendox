import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { NotFoundError } from '@shared/errors';

import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';

import { Subscription } from '../domain/entities/subscription.entity';
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';

export interface GrantedSubscriptionView {
  subscriptionId: string;
  planId: string;
  planName: string;
  currentPeriodEnd: Date;
}

/**
 * Otorga una suscripción activa **sin pasar por la pasarela**.
 *
 * Es una operación de plataforma, no del negocio: la usa el super admin para
 * cuentas de cortesía, internas o de QA, donde mandar al dueño a pagar no tiene
 * sentido. Deliberadamente no tiene `providerSubscriptionId`: no hay nada que
 * cobrar ni webhooks que lleguen, así que la renovación tampoco es automática —
 * al vencer el período, el job de expiración la marca `EXPIRED` y hay que volver
 * a otorgarla o pasar al checkout real.
 *
 * El único camino a esta clase es el controlador de super admin, que audita la
 * acción con el id del admin que la ejecutó. No se expone a rutas de staff.
 */
@Injectable()
export class GrantSubscription {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(organizationId: string, planId: string): Promise<GrantedSubscriptionView> {
    const plan = await this.plans.findById(planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Plan no encontrado o inactivo');
    }

    const now = this.clock.now();
    // Reusa `startCheckout` para el estado inicial y lo activa acto seguido: el
    // constructor de una suscripción ya vive ahí y no hace falta un segundo.
    const subscription = Subscription.startCheckout({ organizationId, planId, now });
    subscription.activateForPeriod(addMonths(now, plan.periodMonths), now);
    await this.subscriptions.save(subscription);

    return {
      subscriptionId: subscription.id,
      planId: plan.id,
      planName: plan.name,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
