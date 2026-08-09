import { DomainEvent } from '@shared/domain';

import type { AppointmentSource, CancellationActor } from '../appointment-source.enum';
import type { AppointmentStatus } from '../appointment-status.enum';

export class AppointmentCreated extends DomainEvent {
  readonly eventName = 'appointment.created';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    readonly status: AppointmentStatus,
    readonly source: AppointmentSource,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class AppointmentConfirmed extends DomainEvent {
  readonly eventName = 'appointment.confirmed';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class AppointmentRejected extends DomainEvent {
  readonly eventName = 'appointment.rejected';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    readonly reason: string | null,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class AppointmentCancelled extends DomainEvent {
  readonly eventName = 'appointment.cancelled';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    readonly actor: CancellationActor,
    readonly reason: string | null,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class AppointmentCompleted extends DomainEvent {
  readonly eventName = 'appointment.completed';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class AppointmentNoShow extends DomainEvent {
  readonly eventName = 'appointment.no_show';
  constructor(
    readonly organizationId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
