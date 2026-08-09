import { Global, Module } from '@nestjs/common';

import { CLOCK, SystemClock } from '@shared/application';

import { TenantContextService } from './tenant/tenant-context.service';

/**
 * Global cross-cutting providers available to every module: the tenant context
 * facade and the system clock. Guards/use-cases depend on these contracts.
 */
@Global()
@Module({
  providers: [TenantContextService, { provide: CLOCK, useClass: SystemClock }],
  exports: [TenantContextService, CLOCK],
})
export class CommonModule {}
