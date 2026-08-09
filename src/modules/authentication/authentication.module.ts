import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AuthGuard } from '@common/guards/auth.guard';
import { RoleGuard } from '@common/guards/role.guard';

import { UsersModule } from '@modules/users/users.module';

import { LoginStaff } from './application/use-cases/login-staff.use-case';
import { LogoutStaff } from './application/use-cases/logout-staff.use-case';
import { RefreshSession } from './application/use-cases/refresh-session.use-case';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER } from './domain/services/password-hasher';
import { AuthController } from './interface/http/controllers/auth.controller';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token.repository';
import { Argon2PasswordHasher } from './infrastructure/providers/argon2-password-hasher';
import { TokenService } from './infrastructure/providers/token.service';

/**
 * Authentication module. Owns staff login/refresh/logout and registers the
 * global {@link AuthGuard} and {@link RoleGuard} (order matters: auth first).
 * Exposes {@link PASSWORD_HASHER} so organization registration can hash the
 * owner's password.
 */
@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: DrizzleRefreshTokenRepository },
    TokenService,
    LoginStaff,
    RefreshSession,
    LogoutStaff,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [PASSWORD_HASHER],
})
export class AuthenticationModule {}
