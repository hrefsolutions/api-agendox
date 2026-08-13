import { randomInt, randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthConfig } from '@config/configuration';
import { CLOCK, type Clock } from '@shared/application';
import { RateLimitError } from '@shared/errors';

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
 * Espera obligatoria antes de cada reenvío, en segundos. El índice es la
 * cantidad de códigos ya emitidos en la ventana: el primer reenvío espera 30 s,
 * el segundo 60 s, y así. La escala es lineal y no exponencial a propósito —
 * esto corre en el medio de una reserva, y hacer esperar ocho minutos hace
 * abandonar la compra.
 */
const RESEND_DELAYS_SECONDS = [30, 60, 90, 120, 150];

/** Envío inicial + los reenvíos de la escala. */
const MAX_SENDS_PER_WINDOW = 1 + RESEND_DELAYS_SECONDS.length;

/**
 * Emails a one-time code to a customer for a public organization (by slug).
 * Anti-enumeration: always succeeds silently, revealing nothing about whether
 * the organization or the email exist.
 *
 * El tope de reenvíos vive acá y no solo en el front: un contador en React se
 * evade recargando la página. El `@Throttle` del controller es complementario —
 * ese limita por IP (y castiga a todos los que comparten NAT), este por
 * (organización, email), que es lo que de verdad se quiere acotar.
 */
@Injectable()
export class RequestCustomerOtp {
  private readonly ttlMinutes: number;
  private readonly resendWindowMinutes: number;

  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(CUSTOMER_OTP_REPOSITORY) private readonly otps: CustomerOtpRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
    configService: ConfigService,
  ) {
    const auth = configService.getOrThrow<AuthConfig>('auth');
    this.ttlMinutes = auth.otpTtlMinutes;
    this.resendWindowMinutes = auth.otpResendWindowMinutes;
  }

  async execute(slug: string, email: string): Promise<void> {
    const organization = await this.organizations.findBySlug(slug);
    if (!organization || !organization.isOperational) {
      return;
    }

    const now = this.clock.now();
    const normalizedEmail = email.trim().toLowerCase();
    await this.assertCanSend(organization.id, normalizedEmail, now);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await this.hasher.hash(code);

    await this.otps.save({
      id: randomUUID(),
      organizationId: organization.id,
      email: normalizedEmail,
      codeHash,
      expiresAt: new Date(now.getTime() + this.ttlMinutes * 60 * 1000),
      attempts: 0,
      consumedAt: null,
      createdAt: now,
    });

    await this.email.send({
      to: normalizedEmail,
      subject: `${organization.name} — tu código de acceso`,
      template: 'otp',
      vars: {
        orgName: organization.name,
        code,
        ttlMinutes: this.ttlMinutes,
      },
    });
  }

  /**
   * Corta el pedido con 429 si el email agotó los envíos de la ventana o si
   * todavía no cumplió la espera del reenvío que le toca.
   *
   * Sólo pesan los códigos **sin consumir**: quien usó su código demostró que el
   * buzón es suyo y no es a quien el tope apunta. Contarlos hacía que entrar y
   * salir un par de veces dejara al cliente una hora sin poder pedir otro
   * código, que era el síntoma "no puedo reenviarme el código".
   *
   * No filtra información: el conteo es por email pedido, exista o no un cliente
   * con esa dirección, así que la respuesta es idéntica para un email real y
   * para uno inventado.
   */
  private async assertCanSend(
    organizationId: string,
    email: string,
    now: Date,
  ): Promise<void> {
    const windowMs = this.resendWindowMinutes * 60 * 1000;
    const since = new Date(now.getTime() - windowMs);
    const sent = await this.otps.countSince(organizationId, email, since);

    if (sent >= MAX_SENDS_PER_WINDOW) {
      // La ventana es deslizante: el cupo se libera cuando el código MÁS VIEJO
      // sale de ella, no cuando envejece el último.
      const oldest = await this.otps.findOldestSince(organizationId, email, since);
      const retryAfterSeconds = oldest
        ? retryAfter(secondsUntil(new Date(oldest.createdAt.getTime() + windowMs), now))
        : this.resendWindowMinutes * 60;
      throw new RateLimitError(
        'Alcanzaste el límite de reenvíos. Probá de nuevo más tarde.',
        retryAfterSeconds,
      );
    }

    if (sent === 0) return;

    const latest = await this.otps.findLatestActive(organizationId, email);
    if (!latest) return;

    const delaySeconds = RESEND_DELAYS_SECONDS[sent - 1] ?? RESEND_DELAYS_SECONDS.at(-1)!;
    const readyAt = new Date(latest.createdAt.getTime() + delaySeconds * 1000);
    const wait = secondsUntil(readyAt, now);
    if (wait > 0) {
      throw new RateLimitError(
        `Esperá ${plural(wait)} antes de pedir otro código.`,
        wait,
      );
    }
  }
}

/**
 * Segundos que faltan para `target`. **Puede ser cero o negativo**: es lo que
 * permite preguntar "¿ya pasó la espera?".
 */
function secondsUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / 1000);
}

/**
 * El valor que se le informa al cliente, nunca cero: un `Retry-After: 0` no le
 * dice nada a quien lo lee. Va sólo en la respuesta — usarlo para **decidir** si
 * se puede enviar hacía que la espera no venciera nunca.
 */
function retryAfter(seconds: number): number {
  return Math.max(1, seconds);
}

/** "1 segundo" y no "1 segundos". */
function plural(seconds: number): string {
  return seconds === 1 ? '1 segundo' : `${seconds} segundos`;
}
