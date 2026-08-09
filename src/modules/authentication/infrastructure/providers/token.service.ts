import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import type { AuthConfig } from '@config/configuration';
import type { AccessTokenPayload } from '@common/guards/auth.guard';
import type { Role } from '@shared/domain';

/** Claims carried by a staff refresh token. */
export interface RefreshTokenPayload {
  sub: string;
  org: string;
  jti: string;
  typ: 'refresh';
}

export interface SignedRefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

/** Signs and verifies staff JWTs using the configured (distinct) secrets. */
@Injectable()
export class TokenService {
  private readonly auth: AuthConfig;

  constructor(
    private readonly jwt: JwtService,
    configService: ConfigService,
  ) {
    this.auth = configService.getOrThrow<AuthConfig>('auth');
  }

  signAccess(input: {
    userId: string;
    organizationId: string;
    role: Role;
    email: string;
  }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: input.userId,
      org: input.organizationId,
      role: input.role,
      email: input.email,
      typ: 'staff',
    };
    return this.jwt.signAsync(payload, {
      secret: this.auth.accessSecret,
      expiresIn: this.auth.accessTtl as JwtSignOptions['expiresIn'],
    });
  }

  async signRefresh(userId: string, organizationId: string): Promise<SignedRefreshToken> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, org: organizationId, jti, typ: 'refresh' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.auth.refreshSecret,
      expiresIn: this.auth.refreshTtl as JwtSignOptions['expiresIn'],
    });
    const decoded = this.jwt.decode<{ exp: number }>(token);
    return { token, jti, expiresAt: new Date(decoded.exp * 1000) };
  }

  verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: this.auth.refreshSecret });
  }
}
