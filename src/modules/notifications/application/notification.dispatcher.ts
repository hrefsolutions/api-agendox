import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CLOCK, type Clock } from '@shared/application';
import type { Money } from '@shared/domain';
import { formatZonedDateTime } from '@shared/domain/temporal/time-zone';

import { AppointmentSource } from '@modules/appointments/domain/appointment-source.enum';
import type { Appointment } from '@modules/appointments/domain/entities/appointment.entity';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '@modules/appointments/domain/repositories/appointment.repository';
import {
  AppointmentCancelled,
  AppointmentConfirmed,
  AppointmentCreated,
  AppointmentRejected,
} from '@modules/appointments/domain/events/appointment.events';
import {
  DepositConfirmed,
  DepositRequested,
} from '@modules/appointments/domain/events/deposit.events';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';
import { SettingsService } from '@modules/settings/application/settings.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

import {
  EMAIL_SENDER,
  type EmailSender,
  type EmailTemplate,
  type EmailVars,
} from './ports/email-sender.port';
import { PUSH_SENDER, type PushPayload, type PushSender } from './ports/push-sender.port';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../domain/notification.repository';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../domain/push-subscription.repository';
import { RecipientType } from '../domain/recipient-type.enum';

/**
 * Fans domain events out to notification channels: in-app feed (polled),
 * Web Push and (for the client) email. Runs after commit; handler failures are
 * isolated by the event publisher.
 */
@Injectable()
export class NotificationDispatcher {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly feed: NotificationRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY) private readonly pushSubs: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    private readonly settings: SettingsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @OnEvent('appointment.created')
  async onCreated(event: AppointmentCreated): Promise<void> {
    if (event.source !== AppointmentSource.Public) return;
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    await this.notifyStaff(event.organizationId, {
      type: 'APPOINTMENT_CREATED',
      title: 'Nueva reserva',
      body: `${s.clientName} reservó ${s.serviceName}.`,
      appointmentId: appointment.id,
    });
  }

  @OnEvent('deposit.requested')
  async onDepositRequested(event: DepositRequested): Promise<void> {
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    const [org, payment] = await Promise.all([
      this.orgContext(s.organizationId),
      this.settings.getPayment(s.organizationId),
    ]);
    await this.notifyClient(appointment, {
      type: 'DEPOSIT_REQUESTED',
      title: 'Enviá la seña para confirmar tu turno',
      body: `Reservaste ${s.serviceName}. Enviá la seña por transferencia para confirmar el turno.`,
      email: {
        template: 'appointment-pending-deposit',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
          resourceName: s.resourceName,
          startsAt: formatZonedDateTime(s.startsAt, org.timeZone),
          depositAmount: formatMoney(s.depositAmount),
          remainingAmount: formatMoney(s.remainingAmount),
          bankName: orDash(payment.bankName),
          accountHolder: orDash(payment.accountHolder),
          alias: orDash(payment.alias),
          cbu: orDash(payment.cbu),
          instructions: payment.instructions ?? '',
        },
      },
    });
  }

  @OnEvent('deposit.confirmed')
  async onDepositConfirmed(event: DepositConfirmed): Promise<void> {
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    const org = await this.orgContext(s.organizationId);
    await this.notifyClient(appointment, {
      type: 'DEPOSIT_CONFIRMED',
      title: 'Seña confirmada',
      body: 'Recibimos tu seña. Tu turno quedó confirmado.',
      email: {
        template: 'deposit-confirmed',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
          startsAt: formatZonedDateTime(s.startsAt, org.timeZone),
        },
      },
    });
  }

  @OnEvent('appointment.confirmed')
  async onConfirmed(event: AppointmentConfirmed): Promise<void> {
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    const org = await this.orgContext(s.organizationId);
    await this.notifyClient(appointment, {
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Turno confirmado',
      body: `Tu turno de ${s.serviceName} está confirmado.`,
      email: {
        template: 'appointment-confirmed',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
          resourceName: s.resourceName,
          startsAt: formatZonedDateTime(s.startsAt, org.timeZone),
        },
      },
    });
  }

  @OnEvent('appointment.rejected')
  async onRejected(event: AppointmentRejected): Promise<void> {
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    const org = await this.orgContext(s.organizationId);
    await this.notifyClient(appointment, {
      type: 'APPOINTMENT_REJECTED',
      title: 'Turno rechazado',
      body: 'Tu turno no pudo confirmarse.',
      email: {
        template: 'appointment-rejected',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
        },
      },
    });
  }

  @OnEvent('appointment.cancelled')
  async onCancelled(event: AppointmentCancelled): Promise<void> {
    const appointment = await this.appointments.findById(event.organizationId, event.appointmentId);
    if (!appointment) return;
    const s = appointment.snapshot;
    const org = await this.orgContext(s.organizationId);
    await this.notifyClient(appointment, {
      type: 'APPOINTMENT_CANCELLED',
      title: 'Turno cancelado',
      body: `Tu turno de ${s.serviceName} fue cancelado.`,
      email: {
        template: 'appointment-cancelled',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
          startsAt: formatZonedDateTime(s.startsAt, org.timeZone),
        },
      },
    });
    await this.notifyStaff(event.organizationId, {
      type: 'APPOINTMENT_CANCELLED',
      title: 'Turno cancelado',
      body: `Se canceló el turno de ${s.clientName}.`,
      appointmentId: appointment.id,
    });
  }

  /**
   * Sends an appointment reminder to the client (in-app + push + email). Driven
   * by the reminder cron, not a domain event; idempotency is the caller's job.
   */
  async sendReminder(appointment: Appointment): Promise<void> {
    const s = appointment.snapshot;
    const org = await this.orgContext(s.organizationId);
    await this.notifyClient(appointment, {
      type: 'APPOINTMENT_REMINDER',
      title: 'Recordatorio de turno',
      body: `Te recordamos tu turno de ${s.serviceName} el ${formatZonedDateTime(s.startsAt, org.timeZone)}.`,
      email: {
        template: 'appointment-reminder',
        vars: {
          orgName: org.orgName,
          customerName: s.clientName,
          serviceName: s.serviceName,
          resourceName: s.resourceName,
          startsAt: formatZonedDateTime(s.startsAt, org.timeZone),
        },
      },
    });
  }

  /** Organization display name + timezone for user-facing copy. */
  private async orgContext(organizationId: string): Promise<{ orgName: string; timeZone: string }> {
    const business = await this.settings.getBusiness(organizationId);
    return {
      orgName: business.businessName || 'Agendox',
      timeZone: business.timezone || 'UTC',
    };
  }

  private async notifyClient(
    appointment: Appointment,
    opts: {
      type: string;
      title: string;
      body: string;
      email?: { template: EmailTemplate; vars: EmailVars };
    },
  ): Promise<void> {
    const s = appointment.snapshot;
    await this.persist(s.organizationId, RecipientType.Client, s.clientId, opts, appointment.id);
    // La app de reservas sirve todos los negocios desde un mismo dominio, con el
    // slug en el path: sin él, el click en la notificación cae en la raíz, que no
    // es la página de ningún negocio.
    const organization = await this.organizations.findById(s.organizationId);
    await this.pushTo(s.organizationId, RecipientType.Client, s.clientId, {
      title: opts.title,
      body: opts.body,
      url: organization ? `/${organization.slug}/portal` : '/',
      tag: `appointment:${appointment.id}`,
    });
    if (opts.email) {
      await this.email.send({
        to: s.clientEmail,
        subject: opts.title,
        template: opts.email.template,
        vars: opts.email.vars,
      });
    }
  }

  private async notifyStaff(
    organizationId: string,
    opts: {
      type: string;
      title: string;
      body: string;
      appointmentId: string;
      /** Sección del panel a la que lleva el click. Por defecto, el calendario. */
      url?: string;
    },
  ): Promise<void> {
    const staff = await this.users.listActiveByOrganization(organizationId);
    for (const user of staff) {
      await this.persist(
        organizationId,
        RecipientType.StaffUser,
        user.id,
        opts,
        opts.appointmentId,
      );
      await this.pushTo(organizationId, RecipientType.StaffUser, user.id, {
        title: opts.title,
        body: opts.body,
        url: opts.url ?? '/calendar',
        tag: `appointment:${opts.appointmentId}`,
      });
    }
  }

  private async persist(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    opts: { type: string; title: string; body: string },
    appointmentId: string,
  ): Promise<void> {
    await this.feed.save({
      id: randomUUID(),
      organizationId,
      recipientType,
      recipientId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      appointmentId,
      createdAt: this.clock.now(),
    });
  }

  private async pushTo(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    payload: PushPayload,
  ): Promise<void> {
    const subs = await this.pushSubs.listActiveByRecipient(
      organizationId,
      recipientType,
      recipientId,
    );
    for (const sub of subs) {
      const result = await this.pushSender.send(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      );
      if (result.gone) {
        await this.pushSubs.markRevoked(sub.endpoint, this.clock.now());
      }
    }
  }
}

/** Formats a monetary amount as Argentine pesos for user-facing copy. */
function formatMoney(amount: Money): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    amount.toNumber(),
  );
}

/** Falls back to an em dash for absent optional transfer fields. */
function orDash(value: string | null): string {
  return value && value.trim() !== '' ? value : '—';
}
