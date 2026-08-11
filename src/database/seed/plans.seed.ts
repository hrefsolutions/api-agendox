import type { Logger } from 'nestjs-pino';

import { Money } from '@shared/domain';
import { Plan } from '@modules/plans/domain/entities/plan.entity';
import { BillingPeriod } from '@modules/plans/domain/plan-status.enum';
import type { PlanRepository } from '@modules/plans/domain/repositories/plan.repository';

interface PlanDefinition {
  name: string;
  price: string;
  billingPeriod: BillingPeriod;
  /**
   * Nombres con los que este plan pudo haberse creado antes. Permiten
   * reconciliar una fila ya cargada en vez de crear un duplicado cuando el
   * nombre comercial cambia (`plans.name` tiene índice único).
   */
  legacyNames?: string[];
}

/**
 * Catálogo comercial vigente. **Única fuente de verdad** de nombres y precios:
 * lo consumen tanto el seed inicial como `pnpm db:fix-plans`.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    name: 'Básico',
    price: '50000.00',
    billingPeriod: BillingPeriod.Monthly,
    legacyNames: ['Basic'],
  },
  {
    name: 'Pro',
    price: '75000.00',
    billingPeriod: BillingPeriod.Monthly,
  },
];

/**
 * Deja los planes iguales al catálogo: crea los que faltan y **corrige** los que
 * existen con otro nombre o precio.
 *
 * Reconcilia en vez de saltear porque un cambio de precio o de nombre tiene que
 * poder aplicarse a una base ya cargada. Reusa la fila existente (mismo `id`)
 * para no dejar huérfanas las suscripciones que la referencian.
 *
 * Idempotente: correrlo dos veces no cambia nada la segunda vez.
 */
export async function reconcilePlans(plans: PlanRepository, logger: Logger): Promise<void> {
  const now = new Date();

  for (const def of PLAN_CATALOG) {
    const price = Money.fromDecimalString(def.price);
    const existing = await findExisting(plans, def);

    if (!existing) {
      await plans.save(
        Plan.create({
          name: def.name,
          price,
          currency: 'ARS',
          billingPeriod: def.billingPeriod,
          now,
        }),
      );
      logger.log(`Plan creado: "${def.name}" ${def.price}`);
      continue;
    }

    const renamed = existing.name !== def.name;
    const repriced = existing.price.cents !== price.cents;
    if (!renamed && !repriced) continue;

    const previousName = existing.name;
    const previousPrice = existing.price.toDecimalString();
    existing.updateCommercials({ name: def.name, price }, now);
    await plans.save(existing);
    logger.log(
      `Plan actualizado: "${previousName}" ${previousPrice} → "${def.name}" ${def.price}`,
    );
  }
}

/** Busca el plan por su nombre actual y, si no está, por los nombres viejos. */
async function findExisting(plans: PlanRepository, def: PlanDefinition): Promise<Plan | null> {
  const current = await plans.findByName(def.name);
  if (current) return current;

  for (const legacy of def.legacyNames ?? []) {
    const found = await plans.findByName(legacy);
    if (found) return found;
  }
  return null;
}
