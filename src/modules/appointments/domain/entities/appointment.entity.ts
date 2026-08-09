import { randomUUID } from 'node:crypto';

import { AggregateRoot, Money } from '@shared/domain';
import { BusinessRuleError } from '@shared/errors';

import { AppointmentSource, type CancellationActor } from '../appointment-source.enum';
import { AppointmentStatus } from '../appointment-status.enum';
import {
  AppointmentCancelled,
  AppointmentCompleted,
  AppointmentConfirmed,
  AppointmentCreated,
  AppointmentNoShow,
  AppointmentRejected,
} from '../events/appointment.events';

interface AppointmentProps {
  organizationId: string;
  serviceId: string;
  serviceName: string;
  serviceOptionId: string;
  durationMinutes: number;
  servicePrice: Money;
  resourceId: string;
  resourceName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  startsAt: Date;
  endsAt: Date;
  depositAmount: Money;
  remainingAmount: Money;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  cancellationReason: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A booking plus an **immutable snapshot** of the service/option/resource/client
 * at booking time (BR-081, BR-160). Later changes to those entities never alter
 * this record. State transitions are guarded by an explicit table.
 */
export class Appointment extends AggregateRoot {
  private constructor(
    id: string,
    private props: AppointmentProps,
  ) {
    super(id);
  }

  static create(
    input: Omit<
      AppointmentProps,
      'cancellationReason' | 'idempotencyKey' | 'createdAt' | 'updatedAt'
    > & {
      now: Date;
      idempotencyKey?: string | null;
    },
  ): Appointment {
    const { now, idempotencyKey = null, ...rest } = input;
    const appointment = new Appointment(randomUUID(), {
      ...rest,
      cancellationReason: null,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
    appointment.addEvent(
      new AppointmentCreated(rest.organizationId, appointment.id, rest.status, rest.source, now),
    );
    if (rest.status === AppointmentStatus.Confirmed) {
      appointment.addEvent(new AppointmentConfirmed(rest.organizationId, appointment.id, now));
    }
    return appointment;
  }

  static fromPersistence(id: string, props: AppointmentProps): Appointment {
    return new Appointment(id, props);
  }

  /** PENDING_DEPOSIT → CONFIRMED (deposit confirmed by staff). */
  confirmViaDeposit(now: Date): void {
    this.transition([AppointmentStatus.PendingDeposit], AppointmentStatus.Confirmed, now);
    this.addEvent(new AppointmentConfirmed(this.props.organizationId, this.id, now));
  }

  /** PENDING_DEPOSIT → REJECTED (deposit rejected by staff). */
  rejectViaDeposit(now: Date): void {
    this.transition([AppointmentStatus.PendingDeposit], AppointmentStatus.Rejected, now);
    this.addEvent(new AppointmentRejected(this.props.organizationId, this.id, null, now));
  }

  /** PENDING_APPROVAL → CONFIRMED (manual approval). */
  approve(now: Date): void {
    this.transition([AppointmentStatus.PendingApproval], AppointmentStatus.Confirmed, now);
    this.addEvent(new AppointmentConfirmed(this.props.organizationId, this.id, now));
  }

  /** PENDING_APPROVAL → REJECTED (manual rejection). */
  rejectApproval(reason: string | null, now: Date): void {
    this.transition([AppointmentStatus.PendingApproval], AppointmentStatus.Rejected, now);
    this.addEvent(new AppointmentRejected(this.props.organizationId, this.id, reason, now));
  }

  /** CONFIRMED → COMPLETED. */
  complete(now: Date): void {
    this.transition([AppointmentStatus.Confirmed], AppointmentStatus.Completed, now);
    this.addEvent(new AppointmentCompleted(this.props.organizationId, this.id, now));
  }

  /** CONFIRMED → NO_SHOW. */
  noShow(now: Date): void {
    this.transition([AppointmentStatus.Confirmed], AppointmentStatus.NoShow, now);
    this.addEvent(new AppointmentNoShow(this.props.organizationId, this.id, now));
  }

  /** {CONFIRMED, PENDING_DEPOSIT, PENDING_APPROVAL} → CANCELLED. */
  cancel(actor: CancellationActor, reason: string | null, now: Date): void {
    this.transition(
      [
        AppointmentStatus.Confirmed,
        AppointmentStatus.PendingDeposit,
        AppointmentStatus.PendingApproval,
      ],
      AppointmentStatus.Cancelled,
      now,
    );
    this.props.cancellationReason = reason;
    this.addEvent(new AppointmentCancelled(this.props.organizationId, this.id, actor, reason, now));
  }

  private transition(from: AppointmentStatus[], to: AppointmentStatus, now: Date): void {
    if (!from.includes(this.props.status)) {
      throw new BusinessRuleError('Transición de turno no permitida', {
        from: this.props.status,
        to,
      });
    }
    this.props.status = to;
    this.props.updatedAt = now;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get status(): AppointmentStatus {
    return this.props.status;
  }
  get resourceId(): string {
    return this.props.resourceId;
  }
  get clientId(): string {
    return this.props.clientId;
  }
  get startsAt(): Date {
    return this.props.startsAt;
  }
  get endsAt(): Date {
    return this.props.endsAt;
  }
  get snapshot(): Readonly<AppointmentProps> {
    return this.props;
  }
}
