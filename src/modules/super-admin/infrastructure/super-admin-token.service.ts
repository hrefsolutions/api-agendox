import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import type { AuthConfig } from '@config/configuration';

/** Claims carried by a super-admin access token (distinct secret + typ). */
export interface SuperAdminTokenPayload {
  sub: string;
  email: string;
  typ: 'superadmin';
}

export interface SignedSuperAdminToken {
  token: string;
  expiresAt: Date;
}

/** Signs and verifies super-admin JWTs with the platform secret. */
@Injectable()
export class SuperAdminTokenService {
  private readonly auth: AuthConfig;

  constructor(
    private readonly jwt: JwtService,
    configService: ConfigService,
  ) {
    this.auth = configService.getOrThrow<AuthConfig>('auth');
  }

  async sign(input: { superAdminId: string; email: string }): Promise<SignedSuperAdminToken> {
    const payload: SuperAdminTokenPayload = {
      sub: input.superAdminId,
      email: input.email,
      typ: 'superadmin',
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.auth.superAdminSecret,
      expiresIn: this.auth.superAdminTtl as JwtSignOptions['expiresIn'],
    });
    const decoded = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(decoded.exp * 1000) };
  }

  verify(token: string): Promise<SuperAdminTokenPayload> {
    return this.jwt.verifyAsync<SuperAdminTokenPayload>(token, {
      secret: this.auth.superAdminSecret,
    });
  }
}
