import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

import { Public } from '@common/decorators/public.decorator';

import { DatabaseHealthIndicator } from './indicators/database.health';

/**
 * Infrastructure health endpoints. Version-neutral and excluded from the API
 * prefix so orchestrators can probe stable, unversioned URLs.
 *
 * - `GET /health`      readiness: process + PostgreSQL connectivity.
 * - `GET /health/live` liveness: process is up (no external dependencies).
 */
@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy('database')]);
  }

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
