import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, UNIT_OF_WORK, type Clock, type UnitOfWork } from '@shared/application';
import { UnauthorizedError } from '@shared/errors';

import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

import type { AuthResult } from '../dtos/auth-result';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/services/password-hasher';
import { TokenService } from '../../infrastructure/providers/token.service';
import { toUserView } from './login-staff.use-case';

/** Rotates a valid refresh token: revokes the old one and issues a fresh pair. */
@Injectable()
export class RefreshSession {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedError('El token de actualización es inválido o expiró');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedError('El token no es un token de actualización');
    }

    const record = await this.refreshTokens.findByJti(payload.jti);
    const now = this.clock.now();
    if (!record || record.revokedAt || record.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedError('El token de actualización ya no es válido');
    }
    const matches = await this.hasher.verify(record.tokenHash, refreshToken);
    if (!matches) {
      throw new UnauthorizedError('El token de actualización no coincide');
    }

    const user = await this.users.findById(record.organizationId, record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('La cuenta de usuario no está activa');
    }

    const accessToken = await this.tokens.signAccess({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });
    const nextRefresh = await this.tokens.signRefresh(user.id, user.organizationId);
    const tokenHash = await this.hasher.hash(nextRefresh.token);

    await this.uow.run(async () => {
      await this.refreshTokens.revoke(record.jti, now);
      await this.refreshTokens.save({
        id: randomUUID(),
        organizationId: user.organizationId,
        userId: user.id,
        jti: nextRefresh.jti,
        tokenHash,
        expiresAt: nextRefresh.expiresAt,
        revokedAt: null,
        createdAt: now,
      });
    });

    return { accessToken, refreshToken: nextRefresh.token, user: toUserView(user) };
  }
}
