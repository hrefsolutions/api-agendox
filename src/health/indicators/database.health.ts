import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';

/**
 * Readiness indicator that verifies PostgreSQL connectivity with a lightweight
 * `SELECT 1`. Used by the `/health` (readiness) probe.
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`SELECT 1`);
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database unreachable';
      return indicator.down({ message });
    }
  }
}
