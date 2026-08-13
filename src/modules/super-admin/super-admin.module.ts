import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { LegalModule } from '@modules/legal/legal.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { PlansModule } from '@modules/plans/plans.module';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';
import { UsersModule } from '@modules/users/users.module';

import { LoginSuperAdmin } from './application/login-super-admin.use-case';
import { SuperAdminService } from './application/super-admin.service';
import { ADMIN_READ_REPOSITORY } from './application/ports/admin-read.repository';
import { ORGANIZATION_PURGE_REPOSITORY } from './application/ports/organization-purge.repository';
import { SUPER_ADMIN_REPOSITORY } from './domain/repositories/super-admin.repository';
import { DrizzleAdminReadRepository } from './infrastructure/persistence/drizzle-admin-read.repository';
import { DrizzleOrganizationPurgeRepository } from './infrastructure/persistence/drizzle-organization-purge.repository';
import { DrizzleSuperAdminRepository } from './infrastructure/persistence/drizzle-super-admin.repository';
import { SuperAdminTokenService } from './infrastructure/super-admin-token.service';
import { SuperAdminController } from './interface/http/super-admin.controller';
import { SuperAdminGuard } from './interface/http/super-admin.guard';

/**
 * Super Admin module (MS5). Platform-global operator with a separate identity,
 * secret and guard; cross-tenant read model + el ciclo de vida completo de las
 * organizaciones (alta, edición, suspensión, baja, borrado definitivo y flags de
 * funcionalidad).
 * Imports AuthenticationModule for the shared password hasher and
 * OrganizationsModule for the tenant repository, el alta y los feature flags.
 */
@Module({
  imports: [
    AuthenticationModule,
    OrganizationsModule,
    UsersModule,
    SubscriptionsModule,
    PlansModule,
    LegalModule,
    // Por el mail de bienvenida del alta: expone `EMAIL_SENDER`.
    NotificationsModule,
    JwtModule.register({}),
  ],
  controllers: [SuperAdminController],
  providers: [
    { provide: SUPER_ADMIN_REPOSITORY, useClass: DrizzleSuperAdminRepository },
    { provide: ADMIN_READ_REPOSITORY, useClass: DrizzleAdminReadRepository },
    { provide: ORGANIZATION_PURGE_REPOSITORY, useClass: DrizzleOrganizationPurgeRepository },
    SuperAdminTokenService,
    SuperAdminGuard,
    LoginSuperAdmin,
    SuperAdminService,
  ],
})
export class SuperAdminModule {}
