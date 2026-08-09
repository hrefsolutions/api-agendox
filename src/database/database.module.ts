import { Global, Inject, Module, type OnModuleDestroy, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { Pool } from 'pg';

import type { DatabaseConfig } from '@config/configuration';
import { UNIT_OF_WORK } from '@shared/application';

import { DRIZZLE, type Database } from './database.constants';
import * as schema from './drizzle/schema';
import { DrizzleUnitOfWork } from './transaction/drizzle-unit-of-work';

/**
 * Internal token for the raw pg connection pool. Kept private to the module so
 * consumers depend only on the Drizzle abstraction ({@link DRIZZLE}).
 */
const PG_POOL = Symbol('PG_POOL');

const poolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService, Logger],
  useFactory: (configService: ConfigService, logger: Logger): Pool => {
    const config = configService.getOrThrow<DatabaseConfig>('database');
    const pool = new Pool({
      connectionString: config.url,
      max: config.poolMax,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });

    return pool;
  },
};

const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [PG_POOL],
  useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
};

/**
 * Global database module.
 *
 * Exposes a single, typed Drizzle client via the {@link DRIZZLE} token and owns
 * the lifecycle of the underlying connection pool. Repositories (added per
 * module from Milestone 1) inject `DRIZZLE` and MUST scope every tenant query
 * by `organizationId` (see docs/04-multi-tenancy.md).
 */
@Global()
@Module({
  providers: [
    poolProvider,
    drizzleProvider,
    { provide: UNIT_OF_WORK, useClass: DrizzleUnitOfWork },
  ],
  exports: [DRIZZLE, UNIT_OF_WORK],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
