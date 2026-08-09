import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, UNIT_OF_WORK, type Clock, type UnitOfWork } from '@shared/application';
import { UnauthorizedError } from '@shared/errors';

import type { User } from '@modules/users/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

import type { AuthResult, AuthUserView } from '../dtos/auth-result';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/services/password-hasher';
import { TokenService } from '../../infrastructure/providers/token.service';

export interface LoginStaffInput {
  email: string;
  password: string;
}

/** Authenticates a staff user and issues an access + rotating refresh token. */
@Injectable()
export class LoginStaff {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: LoginStaffInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // Verify against a real hash (or a stable dummy when the user is absent) so
    // timing does not reveal whether the email exists.
    const passwordOk = user
      ? await this.hasher.verify(user.passwordHash, input.password)
      : await this.hasher.verifyAgainstDummy(input.password);
    if (!user || !passwordOk) {
      throw new UnauthorizedError('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('La cuenta de usuario no está activa');
    }

    const now = this.clock.now();
    const accessToken = await this.tokens.signAccess({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });
    const refresh = await this.tokens.signRefresh(user.id, user.organizationId);
    const tokenHash = await this.hasher.hash(refresh.token);

    await this.uow.run(async () => {
      user.recordLogin(now);
      await this.users.save(user);
      await this.refreshTokens.save({
        id: randomUUID(),
        organizationId: user.organizationId,
        userId: user.id,
        jti: refresh.jti,
        tokenHash,
        expiresAt: refresh.expiresAt,
        revokedAt: null,
        createdAt: now,
      });
    });

    return { accessToken, refreshToken: refresh.token, user: toUserView(user) };
  }
}

export function toUserView(user: User): AuthUserView {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
  };
}
