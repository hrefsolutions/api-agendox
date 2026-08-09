import { Module } from '@nestjs/common';

import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { TrialsModule } from '@modules/trials/trials.module';
import { UsersModule } from '@modules/users/users.module';

import { GetCurrentOrganization } from './application/use-cases/get-current-organization.use-case';
import { RegisterOrganization } from './application/use-cases/register-organization.use-case';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository';
import { OrganizationsController } from './interface/http/controllers/organizations.controller';
import { DrizzleOrganizationRepository } from './infrastructure/persistence/drizzle-organization.repository';

/**
 * Organizations module. Owns tenant registration (Organization + Owner + Trial)
 * and exposes {@link ORGANIZATION_REPOSITORY} for other modules.
 */
@Module({
  imports: [UsersModule, TrialsModule, AuthenticationModule, SettingsModule],
  controllers: [OrganizationsController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: DrizzleOrganizationRepository },
    RegisterOrganization,
    GetCurrentOrganization,
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
