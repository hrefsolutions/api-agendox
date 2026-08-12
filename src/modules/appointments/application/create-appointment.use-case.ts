import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  DOMAIN_EVENT_PUBLISHER,
  UNIT_OF_WORK,
  type Clock,
  type DomainEventPublisher,
  type UnitOfWork,
} from '@shared/application';
import { Money, type DomainEvent } from '@shared/domain';
import { BusinessRuleError, ConflictError, NotFoundError } from '@shared/errors';
import { utcMsToZonedDate } from '@shared/domain/temporal/time-zone';

import { SettingsService } from '@modules/settings/application/settings.service';
import { DepositType, type PaymentSettings } from '@modules/settings/domain/settings.types';
import {
  AvailabilityCalculator,
  type BusyInterval,
} from '@modules/availability/domain/availability-calculator';
import {
  SERVICE_OPTION_REPOSITORY,
  type ServiceOptionRepository,
} from '@modules/services/domain/repositories/service-option.repository';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '@modules/services/domain/repositories/service.repository';
import {
  BLOCKED_TIME_REPOSITORY,
  RESOURCE_REPOSITORY,
  RESOURCE_SCHEDULE_REPOSITORY,
  RESOURCE_SERVICE_REPOSITORY,
  type BlockedTimeRepository,
  type ResourceRepository,
  type ResourceScheduleRepository,
  type ResourceServiceRepository,
} from '@modules/resources/domain/repositories';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '@modules/clients/domain/repositories/client.repository';

import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { Appointment } from '../domain/entities/appointment.entity';
import { Deposit } from '../domain/entities/deposit.entity';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '../domain/repositories/appointment.repository';
import {
  DEPOSIT_REPOSITORY,
  type DepositRepository,
} from '../domain/repositories/deposit.repository';
import { toAppointmentView, type AppointmentView } from './appointment.view';
import { ORGANIZATION_ACCESS, type OrganizationAccess } from './ports/organization-access.port';

export interface CreateAppointmentInput {
  serviceId: string;
  serviceOptionId: string;
  resourceId: string;
  clientId: string;
  startsAt: Date;
  source: AppointmentSource;
  notes?: string | null;
  /** Client-supplied key that makes a public booking idempotent (double-submit safe). */
  idempotencyKey?: string | null;
}

/**
 * Creates an appointment transactionally: validates the tenant entities, locks
 * the resource row, re-validates availability, builds the immutable snapshot,
 * computes the deposit once (BR-102), decides the initial state and — if a
 * deposit applies — creates it. Prevents double-booking via the resource lock +
 * overlap check. Domain events are published after commit.
 */
@Injectable()
export class CreateAppointment {
  private readonly calculator = new AvailabilityCalculator();

  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(DEPOSIT_REPOSITORY) private readonly deposits: DepositRepository,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_OPTION_REPOSITORY) private readonly serviceOptions: ServiceOptionRepository,
    @Inject(RESOURCE_REPOSITORY) private readonly resources: ResourceRepository,
    @Inject(RESOURCE_SCHEDULE_REPOSITORY) private readonly schedules: ResourceScheduleRepository,
    @Inject(BLOCKED_TIME_REPOSITORY) private readonly blocks: BlockedTimeRepository,
    @Inject(RESOURCE_SERVICE_REPOSITORY) private readonly links: ResourceServiceRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ORGANIZATION_ACCESS) private readonly access: OrganizationAccess,
    private readonly settings: SettingsService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
  ) {}

  async execute(organizationId: string, input: CreateAppointmentInput): Promise<AppointmentView> {
    // Idempotent replay: a repeated submit with the same key returns the original.
    if (input.idempotencyKey) {
      const existing = await this.appointments.findByIdempotencyKey(
        organizationId,
        input.idempotencyKey,
      );
      if (existing) return toAppointmentView(existing);
    }

    if (!(await this.access.canOperate(organizationId))) {
      throw new BusinessRuleError(
        'La organización no puede aceptar reservas: no tiene una prueba ni una suscripción activa',
      );
    }

    const service = await this.services.findById(organizationId, input.serviceId);
    if (!service || !service.active) {
      throw new NotFoundError('Servicio no encontrado o inactivo');
    }
    const option = await this.serviceOptions.findById(organizationId, input.serviceOptionId);
    if (!option || !option.active || option.serviceId !== input.serviceId) {
      throw new NotFoundError('Opción de servicio no encontrada para este servicio');
    }
    const resource = await this.resources.findById(organizationId, input.resourceId);
    if (!resource || !resource.active) {
      throw new NotFoundError('Recurso no encontrado o inactivo');
    }
    if (!(await this.links.exists(organizationId, input.resourceId, input.serviceId))) {
      throw new BusinessRuleError('El recurso no está habilitado para este servicio');
    }
    const client = await this.clients.findById(organizationId, input.clientId);
    if (!client) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const [payment, booking, business, businessHours, resourceSchedules, allBlocks] =
      await Promise.all([
        this.settings.getPayment(organizationId),
        this.settings.getBooking(organizationId),
        this.settings.getBusiness(organizationId),
        this.settings.getBusinessHours(organizationId),
        this.schedules.getByResource(organizationId, input.resourceId),
        this.blocks.list(organizationId),
      ]);

    const timeZone = business.timezone;
    const startMs = input.startsAt.getTime();
    const endMs = startMs + option.durationMinutes * 60 * 1000;
    const endsAt = new Date(endMs);

    const depositAmount = computeDeposit(option.price, payment);
    const remainingAmount = Money.fromCents(option.price.cents - depositAmount.cents);
    const hasDeposit = depositAmount.cents > 0;
    const status = hasDeposit
      ? AppointmentStatus.PendingDeposit
      : booking.requiresManualApproval
        ? AppointmentStatus.PendingApproval
        : AppointmentStatus.Confirmed;

    const blockBusy: BusyInterval[] = allBlocks
      .filter(
        (block) =>
          (block.resourceId === null || block.resourceId === input.resourceId) &&
          block.startsAt.getTime() < endMs &&
          block.endsAt.getTime() > startMs,
      )
      .map((block) => ({ startMs: block.startsAt.getTime(), endMs: block.endsAt.getTime() }));

    const now = this.clock.now();

    // Public bookings must respect the booking window; staff may override.
    if (input.source === AppointmentSource.Public) {
      const earliest = now.getTime() + booking.minNoticeMinutes * 60 * 1000;
      const latest = now.getTime() + booking.maxAdvanceDays * 24 * 60 * 60 * 1000;
      if (startMs < earliest || startMs > latest) {
        throw new BusinessRuleError('El horario solicitado está fuera de la ventana de reserva permitida');
      }
    }

    let result: { appointment: Appointment; events: DomainEvent[] };
    try {
      result = await this.uow.run(async () => {
      const locked = await this.resources.lockActive(organizationId, input.resourceId);
      if (!locked) {
        throw new NotFoundError('Recurso no encontrado o inactivo');
      }

      const bookable = this.calculator.isBookable({
        timeZone,
        date: utcMsToZonedDate(startMs, timeZone),
        businessHours,
        resourceSchedules,
        busy: blockBusy,
        startMs,
        endMs,
      });
      if (!bookable) {
        throw new BusinessRuleError('El horario solicitado está fuera de la disponibilidad o está bloqueado');
      }
      if (
        await this.appointments.hasActiveOverlap(organizationId, input.resourceId, startMs, endMs)
      ) {
        throw new ConflictError('Ese horario ya fue reservado');
      }

      const created = Appointment.create({
        organizationId,
        serviceId: service.id,
        serviceName: service.name,
        serviceOptionId: option.id,
        serviceOptionName: option.name,
        durationMinutes: option.durationMinutes,
        servicePrice: option.price,
        resourceId: resource.id,
        resourceName: resource.name,
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        clientPhone: client.whatsapp,
        clientEmail: client.email,
        startsAt: input.startsAt,
        endsAt,
        depositAmount,
        remainingAmount,
        status,
        source: input.source,
        notes: input.notes ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        now,
      });
      await this.appointments.save(created);

      const collected: DomainEvent[] = [];
      if (hasDeposit) {
        const ttlHours = resolveDepositTtlHours(payment.depositTtlHours);
        const deposit = Deposit.request({
          organizationId,
          appointmentId: created.id,
          expectedAmount: depositAmount,
          expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1000),
          now,
        });
        await this.deposits.save(deposit);
        collected.push(...deposit.pullEvents());
      }
      collected.push(...created.pullEvents());
      return { appointment: created, events: collected };
      });
    } catch (error) {
      // Concurrent same-key submit lost the race on the unique index: replay it.
      if (input.idempotencyKey && isIdempotencyConflict(error)) {
        const existing = await this.appointments.findByIdempotencyKey(
          organizationId,
          input.idempotencyKey,
        );
        if (existing) return toAppointmentView(existing);
      }
      throw error;
    }

    await this.publisher.publishAll(result.events);
    return toAppointmentView(result.appointment);
  }
}

const DEFAULT_DEPOSIT_TTL_HOURS = 24;

/** Per-org deposit TTL in hours, falling back to the global env default. */
function resolveDepositTtlHours(perOrg: number | null): number {
  if (perOrg !== null && perOrg > 0) return perOrg;
  const fromEnv = Number(process.env.DEPOSIT_TTL_HOURS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DEPOSIT_TTL_HOURS;
}

/** True for a Postgres unique-violation on the idempotency index. */
function isIdempotencyConflict(error: unknown): boolean {
  const e = error as { code?: string; constraint?: string } | null;
  return e?.code === '23505' && e?.constraint === 'appointments_idempotency_uq';
}

function computeDeposit(price: Money, payment: PaymentSettings): Money {
  if (!payment.depositEnabled || !payment.depositType || payment.depositValue === null) {
    return Money.fromCents(0);
  }
  if (payment.depositType === DepositType.Fixed) {
    const fixed = Money.fromDecimalString(payment.depositValue);
    return Money.fromCents(Math.min(fixed.cents, price.cents));
  }
  // PERCENTAGE
  const percentage = Number(payment.depositValue);
  const cents = Math.min(price.cents, Math.round((price.cents * percentage) / 100));
  return Money.fromCents(cents);
}
