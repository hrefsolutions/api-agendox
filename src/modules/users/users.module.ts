import { Module } from '@nestjs/common';

import { PASSWORD_HASHER } from '@modules/authentication/domain/services/password-hasher';
import { Argon2PasswordHasher } from '@modules/authentication/infrastructure/providers/argon2-password-hasher';

import { UsersService } from './application/users.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { UsersController } from './interface/http/users.controller';

/**
 * Users module. Exposes the {@link USER_REPOSITORY} contract so other modules
 * (authentication, organizations) provision and read users through it, and — as
 * of MS1 — the HTTP surface for staff/team management ({@link UsersController}).
 *
 * PASSWORD_HASHER is bound locally (rather than imported from
 * AuthenticationModule) because AuthenticationModule already imports this
 * module; importing it back would create a circular dependency. Argon2 is
 * stateless, so a second binding is harmless.
 */
@Module({
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    UsersService,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
