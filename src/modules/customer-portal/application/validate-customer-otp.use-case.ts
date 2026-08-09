import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthConfig } from '@config/configuration';
import { CLOCK, type Clock } from '@shared/application';
import { UnauthorizedError } from '@shared/errors';

import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@modules/authentication/domain/services/password-hasher';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '@modules/clients/domain/repositories/client.repository';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';

import {
  CUSTOMER_OTP_REPOSITORY,
  type CustomerOtpRepository,
} from '../domain/customer-otp.repository';
import { CustomerTokenService } from '../infrastructure/customer-token.service';

export interface ValidateCustomerOtpResult {
  token: string;
  /** Whether the customer already has a completed profile (client record). */
  profileComplete: boolean;
}

/** Validates an OTP code and issues a customer session token. */
@Injectable()
export class ValidateCustomerOtp {
  private readonly maxAttempts: number;

  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(CUSTOMER_OTP_REPOSITORY) private readonly otps: CustomerOtpRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokens: CustomerTokenService,
    configService: ConfigService,
  ) {
    this.maxAttempts = configService.getOrThrow<AuthConfig>('auth').otpMaxAttempts;
  }

  async execute(slug: string, email: string, code: string): Promise<ValidateCustomerOtpResult> {
    const organization = await this.organizations.findBySlug(slug);
    if (!organization) {
      throw new UnauthorizedError('El código es inválido o expiró');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = await this.otps.findLatestActive(organization.id, normalizedEmail);
    const now = this.clock.now();
    if (!otp || otp.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedError('El código es inválido o expiró');
    }
    if (otp.attempts >= this.maxAttempts) {
      throw new UnauthorizedError('Demasiados intentos; solicitá un código nuevo');
    }

    const matches = await this.hasher.verify(otp.codeHash, code);
    if (!matches) {
      await this.otps.incrementAttempts(otp.id);
      throw new UnauthorizedError('El código es inválido o expiró');
    }

    await this.otps.consume(otp.id, now);
    const token = await this.tokens.sign(normalizedEmail, organization.id);
    const client = await this.clients.findByEmail(organization.id, normalizedEmail);
    return { token, profileComplete: client !== null };
  }
}
