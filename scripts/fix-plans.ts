/**
 * Deja los planes de la base iguales al catálogo de `PLAN_CATALOG`
 * (`src/database/seed/plans.seed.ts`): crea los que falten y corrige nombre y
 * precio de los que ya existan.
 *
 * Existe aparte del seed porque en producción no querés correr `pnpm db:seed`
 * completo — ese además intenta crear la organización de demo. Esto toca solo la
 * tabla `plans`.
 *
 * Es idempotente: corriéndolo dos veces, la segunda no cambia nada.
 *
 * Run: `pnpm db:fix-plans`
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@app/app.module';
import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';

import { reconcilePlans } from '../src/database/seed/plans.seed';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  try {
    await reconcilePlans(app.get<PlanRepository>(PLAN_REPOSITORY), logger);
    logger.log('[fix-plans] listo.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('[fix-plans] failed:', error);
  process.exit(1);
});
