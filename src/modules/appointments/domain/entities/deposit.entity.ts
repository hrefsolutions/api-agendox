import { randomUUID } from 'node:crypto';

import { AggregateRoot, Money } from '@shared/domain';
import { BusinessRuleError } from '@shared/errors';

import { DepositStatus } from '../deposit-status.enum';
import {
  DepositConfirmed,
  DepositExpired,
  DepositRejected,
  DepositRequested,
} from '../events/deposit.events';

interface DepositProps {
  organizationId: string;
  appointmentId: string;
  expectedAmount: Money;
  receivedAmount: Money | null;
  status: DepositStatus;
  requestedAt: Date;
  /** When a still-pending deposit expires (captured per-org at creation). */
  expiresAt: Date;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  notes: string | null;
}

/** The expected deposit for an appointment. Verification is always manual (BR-104). */
export class Deposit extends AggregateRoot {
  private constructor(
    id: string,
    private props: DepositProps,
  ) {
    super(id);
  }

  static request(input: {
    organizationId: string;
    appointmentId: string;
    expectedAmount: Money;
    expiresAt: Date;
    now: Date;
  }): Deposit {
    const deposit = new Deposit(randomUUID(), {
      organizationId: input.organizationId,
      appointmentId: input.appointmentId,
      expectedAmount: input.expectedAmount,
      receivedAmount: null,
      status: DepositStatus.Pending,
      requestedAt: input.now,
      expiresAt: input.expiresAt,
      confirmedAt: null,
      confirmedBy: null,
      notes: null,
    });
    deposit.addEvent(
      new DepositRequested(input.organizationId, deposit.id, input.appointmentId, input.now),
    );
    return deposit;
  }

  static fromPersistence(id: string, props: DepositProps): Deposit {
    return new Deposit(id, props);
  }

  confirm(confirmedByUserId: string, now: Date): void {
    this.ensurePending();
    this.props.status = DepositStatus.Confirmed;
    this.props.receivedAmount = this.props.expectedAmount;
    this.props.confirmedAt = now;
    this.props.confirmedBy = confirmedByUserId;
    this.addEvent(
      new DepositConfirmed(
        this.props.organizationId,
        this.id,
        this.props.appointmentId,
        confirmedByUserId,
        now,
      ),
    );
  }

  reject(now: Date): void {
    this.ensurePending();
    this.props.status = DepositStatus.Rejected;
    this.addEvent(
      new DepositRejected(this.props.organizationId, this.id, this.props.appointmentId, now),
    );
  }

  expire(now: Date): void {
    this.ensurePending();
    this.props.status = DepositStatus.Expired;
    this.addEvent(
      new DepositExpired(this.props.organizationId, this.id, this.props.appointmentId, now),
    );
  }

  private ensurePending(): void {
    if (this.props.status !== DepositStatus.Pending) {
      throw new BusinessRuleError('Transición de seña no permitida', { from: this.props.status });
    }
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get appointmentId(): string {
    return this.props.appointmentId;
  }
  get status(): DepositStatus {
    return this.props.status;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get snapshot(): Readonly<DepositProps> {
    return this.props;
  }
}
