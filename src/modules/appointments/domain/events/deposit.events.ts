import { DomainEvent } from '@shared/domain';

export class DepositRequested extends DomainEvent {
  readonly eventName = 'deposit.requested';
  constructor(
    readonly organizationId: string,
    readonly depositId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class DepositConfirmed extends DomainEvent {
  readonly eventName = 'deposit.confirmed';
  constructor(
    readonly organizationId: string,
    readonly depositId: string,
    readonly appointmentId: string,
    readonly confirmedBy: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class DepositRejected extends DomainEvent {
  readonly eventName = 'deposit.rejected';
  constructor(
    readonly organizationId: string,
    readonly depositId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}

export class DepositExpired extends DomainEvent {
  readonly eventName = 'deposit.expired';
  constructor(
    readonly organizationId: string,
    readonly depositId: string,
    readonly appointmentId: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
