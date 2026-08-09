import { randomInt, randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthConfig } from '@config/configuration';
import { CLOCK, type Clock } from '@shared/application';

import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@modules/authentication/domain/services/password-hasher';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '@modules/notifications/application/ports/email-sender.port';

import {
  CUSTOMER_OTP_REPOSITORY,
  type CustomerOtpRepository,
} from '../domain/customer-otp.repository';

/**
 * Emails a one-time code to a customer for a public organization (by slug).
 * Anti-enumeration: always succeeds silently, revealing nothing about whether
 * the organization or the email exist.
 */
@Injectable()
export class RequestCustomerOtp {
  private readonly ttlMinutes: number;

  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(CUSTOMER_OTP_REPOSITORY) private readonly otps: CustomerOtpRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
    configService: ConfigService,
  ) {
    this.ttlMinutes = configService.getOrThrow<AuthConfig>('auth').otpTtlMinutes;
  }

  async execute(slug: string, email: string): Promise<void> {
    const organization = await this.organizations.findBySlug(slug);
    if (!organization || !organization.isOperational) {
      return;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = this.clock.now();
    const codeHash = await this.hasher.hash(code);

    await this.otps.save({
      id: randomUUID(),
      organizationId: organization.id,
      email: email.trim().toLowerCase(),
      codeHash,
      expiresAt: new Date(now.getTime() + this.ttlMinutes * 60 * 1000),
      attempts: 0,
      consumedAt: null,
      createdAt: now,
    });

    await this.email.send({
      to: email.trim().toLowerCase(),
      subject: `${organization.name} — tu código de acceso`,
      template: 'otp',
      vars: {
        orgName: organization.name,
        code,
        ttlMinutes: this.ttlMinutes,
      },
    });
  }
}
