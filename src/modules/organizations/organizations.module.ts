import { Module } from '@nestjs/common';

import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { LegalModule } from '@modules/legal/legal.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { TrialsModule } from '@modules/trials/trials.module';
import { UsersModule } from '@modules/users/users.module';

import { OrganizationFeaturesService } from './application/organization-features.service';
import { GetCurrentOrganization } from './application/use-cases/get-current-organization.use-case';
import { RegisterOrganization } from './application/use-cases/register-organization.use-case';
import { ORGANIZATION_FEATURES_REPOSITORY } from './domain/organization-features';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository';
import { OrganizationsController } from './interface/http/controllers/organizations.controller';
import { DrizzleOrganizationFeaturesRepository } from './infrastructure/persistence/drizzle-organization-features.repository';
import { DrizzleOrganizationRepository } from './infrastructure/persistence/drizzle-organization.repository';

/**
 * Organizations module. Owns tenant registration (Organization + Owner + Trial)
 * and exposes {@link ORGANIZATION_REPOSITORY} for other modules.
 *
 * `RegisterOrganization` ya no tiene ruta pública: lo consume el módulo de
 * super-admin, que es el único autorizado a dar de alta un negocio.
 */
@Module({
  imports: [UsersModule, TrialsModule, AuthenticationModule, SettingsModule, LegalModule],
  controllers: [OrganizationsController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: DrizzleOrganizationRepository },
    {
      provide: ORGANIZATION_FEATURES_REPOSITORY,
      useClass: DrizzleOrganizationFeaturesRepository,
    },
    OrganizationFeaturesService,
    RegisterOrganization,
    GetCurrentOrganization,
  ],
  exports: [ORGANIZATION_REPOSITORY, OrganizationFeaturesService, RegisterOrganization],
})
export class OrganizationsModule {}
