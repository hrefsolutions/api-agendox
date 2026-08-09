import { Module } from '@nestjs/common';

import { ServicesModule } from '@modules/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';

import { ResourcesService } from './application/resources.service';
import {
  BLOCKED_TIME_REPOSITORY,
  RESOURCE_REPOSITORY,
  RESOURCE_SCHEDULE_REPOSITORY,
  RESOURCE_SERVICE_REPOSITORY,
} from './domain/repositories';
import { BlockedTimesController } from './interface/http/blocked-times.controller';
import { ResourcesController } from './interface/http/resources.controller';
import { DrizzleBlockedTimeRepository } from './infrastructure/persistence/drizzle-blocked-time.repository';
import { DrizzleResourceScheduleRepository } from './infrastructure/persistence/drizzle-resource-schedule.repository';
import { DrizzleResourceServiceRepository } from './infrastructure/persistence/drizzle-resource-service.repository';
import { DrizzleResourceRepository } from './infrastructure/persistence/drizzle-resource.repository';

/**
 * Resources module (M3): bookable resources plus their weekly schedules, time
 * blocks and resource↔service links. Imports {@link ServicesModule} to validate
 * that assigned services belong to the same tenant. Exports the resource and
 * link repositories for the availability engine (M4).
 */
@Module({
  imports: [ServicesModule, SettingsModule],
  controllers: [ResourcesController, BlockedTimesController],
  providers: [
    { provide: RESOURCE_REPOSITORY, useClass: DrizzleResourceRepository },
    { provide: RESOURCE_SCHEDULE_REPOSITORY, useClass: DrizzleResourceScheduleRepository },
    { provide: BLOCKED_TIME_REPOSITORY, useClass: DrizzleBlockedTimeRepository },
    { provide: RESOURCE_SERVICE_REPOSITORY, useClass: DrizzleResourceServiceRepository },
    ResourcesService,
  ],
  exports: [
    RESOURCE_REPOSITORY,
    RESOURCE_SCHEDULE_REPOSITORY,
    RESOURCE_SERVICE_REPOSITORY,
    BLOCKED_TIME_REPOSITORY,
  ],
})
export class ResourcesModule {}
