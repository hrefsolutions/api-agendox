import { Module } from '@nestjs/common';

import { ServicesService } from './application/services.service';
import { SERVICE_OPTION_REPOSITORY } from './domain/repositories/service-option.repository';
import { SERVICE_REPOSITORY } from './domain/repositories/service.repository';
import { ServicesController } from './interface/http/services.controller';
import { DrizzleServiceOptionRepository } from './infrastructure/persistence/drizzle-service-option.repository';
import { DrizzleServiceRepository } from './infrastructure/persistence/drizzle-service.repository';

/**
 * Services module (M3): services and their reservable options. Exports the
 * repositories so resources (resource↔service links) and, later, appointments
 * can reference them by contract.
 */
@Module({
  controllers: [ServicesController],
  providers: [
    { provide: SERVICE_REPOSITORY, useClass: DrizzleServiceRepository },
    { provide: SERVICE_OPTION_REPOSITORY, useClass: DrizzleServiceOptionRepository },
    ServicesService,
  ],
  exports: [SERVICE_REPOSITORY, SERVICE_OPTION_REPOSITORY],
})
export class ServicesModule {}
