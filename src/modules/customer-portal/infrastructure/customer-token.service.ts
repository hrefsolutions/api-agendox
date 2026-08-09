import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import type { AuthConfig } from '@config/configuration';

export interface CustomerTokenPayload {
  sub: string;
  org: string;
  typ: 'customer';
}

/** Signs/verifies customer session JWTs with a secret separate from staff tokens. */
@Injectable()
export class CustomerTokenService {
  private readonly auth: AuthConfig;

  constructor(
    private readonly jwt: JwtService,
    configService: ConfigService,
  ) {
    this.auth = configService.getOrThrow<AuthConfig>('auth');
  }

  sign(email: string, organizationId: string): Promise<string> {
    const payload: CustomerTokenPayload = {
      sub: email.trim().toLowerCase(),
      org: organizationId,
      typ: 'customer',
    };
    return this.jwt.signAsync(payload, {
      secret: this.auth.customerSecret,
      expiresIn: this.auth.customerTtl as JwtSignOptions['expiresIn'],
    });
  }

  verify(token: string): Promise<CustomerTokenPayload> {
    return this.jwt.verifyAsync<CustomerTokenPayload>(token, { secret: this.auth.customerSecret });
  }
}
