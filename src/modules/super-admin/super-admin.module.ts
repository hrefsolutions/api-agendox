import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';

import { LoginSuperAdmin } from './application/login-super-admin.use-case';
import { SuperAdminService } from './application/super-admin.service';
import { ADMIN_READ_REPOSITORY } from './application/ports/admin-read.repository';
import { SUPER_ADMIN_REPOSITORY } from './domain/repositories/super-admin.repository';
import { DrizzleAdminReadRepository } from './infrastructure/persistence/drizzle-admin-read.repository';
import { DrizzleSuperAdminRepository } from './infrastructure/persistence/drizzle-super-admin.repository';
import { SuperAdminTokenService } from './infrastructure/super-admin-token.service';
import { SuperAdminController } from './interface/http/super-admin.controller';
import { SuperAdminGuard } from './interface/http/super-admin.guard';

/**
 * Super Admin module (MS5). Platform-global operator with a separate identity,
 * secret and guard; cross-tenant read model + controlled tenant status changes.
 * Imports AuthenticationModule for the shared password hasher and
 * OrganizationsModule for the tenant repository (suspend/reactivate).
 */
@Module({
  imports: [AuthenticationModule, OrganizationsModule, JwtModule.register({})],
  controllers: [SuperAdminController],
  providers: [
    { provide: SUPER_ADMIN_REPOSITORY, useClass: DrizzleSuperAdminRepository },
    { provide: ADMIN_READ_REPOSITORY, useClass: DrizzleAdminReadRepository },
    SuperAdminTokenService,
    SuperAdminGuard,
    LoginSuperAdmin,
    SuperAdminService,
  ],
})
export class SuperAdminModule {}
