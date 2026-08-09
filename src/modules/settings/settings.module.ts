import { Module } from '@nestjs/common';

import { SettingsService } from './application/settings.service';
import { SETTINGS_REPOSITORY } from './domain/settings.repository';
import { DrizzleSettingsRepository } from './infrastructure/persistence/drizzle-settings.repository';
import { SettingsController } from './interface/http/settings.controller';

/**
 * Business configuration module (M2). Owns the tenant's settings and business
 * hours. Exports {@link SettingsService} so organization registration can seed
 * default settings within the same transaction.
 */
@Module({
  controllers: [SettingsController],
  providers: [
    { provide: SETTINGS_REPOSITORY, useClass: DrizzleSettingsRepository },
    SettingsService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
