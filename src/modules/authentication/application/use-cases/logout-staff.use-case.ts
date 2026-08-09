import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { TokenService } from '../../infrastructure/providers/token.service';

/** Revokes the presented refresh token. Idempotent: unknown tokens are a no-op. */
@Injectable()
export class LogoutStaff {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    let jti: string;
    try {
      const payload = await this.tokens.verifyRefresh(refreshToken);
      jti = payload.jti;
    } catch {
      return;
    }
    await this.refreshTokens.revoke(jti, this.clock.now());
  }
}
