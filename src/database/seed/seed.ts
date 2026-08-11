import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@app/app.module';
import { RegisterOrganization } from '@modules/organizations/application/use-cases/register-organization.use-case';
import {
  PLAN_REPOSITORY,
  type PlanRepository,
} from '@modules/plans/domain/repositories/plan.repository';
import { ConflictError } from '@shared/errors';

import { reconcilePlans } from './plans.seed';

/**
 * Idempotent bootstrap seed: creates the first Organization + Owner + Trial via
 * the same `RegisterOrganization` use-case the public signup endpoint uses.
 *
 * Configure via env: SEED_ORG_NAME, SEED_ORG_SLUG, SEED_ORG_TZ, SEED_OWNER_EMAIL,
 * SEED_OWNER_PASSWORD, SEED_OWNER_FIRSTNAME, SEED_OWNER_LASTNAME.
 *
 * Run: `pnpm db:seed` (requires a migrated database).
 */
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);
  const register = app.get(RegisterOrganization);

  await reconcilePlans(app.get<PlanRepository>(PLAN_REPOSITORY), logger);

  try {
    const result = await register.execute({
      organizationName: process.env.SEED_ORG_NAME ?? 'Demo Barbershop',
      slug: process.env.SEED_ORG_SLUG ?? 'demo',
      timezone: process.env.SEED_ORG_TZ ?? 'America/Argentina/Buenos_Aires',
      owner: {
        email: process.env.SEED_OWNER_EMAIL ?? 'owner@demo.test',
        password: process.env.SEED_OWNER_PASSWORD ?? 'changeme123',
        firstName: process.env.SEED_OWNER_FIRSTNAME ?? 'Demo',
        lastName: process.env.SEED_OWNER_LASTNAME ?? 'Owner',
      },
    });
    logger.log(
      `Seeded organization "${result.slug}" (${result.organizationId}); owner user ${result.ownerUserId}`,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      logger.warn(`Seed skipped: ${error.message}`);
    } else {
      throw error;
    }
  } finally {
    await app.close();
  }
}

void seed();
