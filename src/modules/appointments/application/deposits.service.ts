import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  DOMAIN_EVENT_PUBLISHER,
  UNIT_OF_WORK,
  type Clock,
  type DomainEventPublisher,
  type UnitOfWork,
} from '@shared/application';
import { NotFoundError } from '@shared/errors';

import type { Appointment } from '../domain/entities/appointment.entity';
import type { Deposit } from '../domain/entities/deposit.entity';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '../domain/repositories/appointment.repository';
import {
  DEPOSIT_REPOSITORY,
  type DepositRepository,
} from '../domain/repositories/deposit.repository';

export interface DepositView {
  id: string;
  appointmentId: string;
  expectedAmount: number;
  receivedAmount: number | null;
  status: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  confirmedBy: string | null;
}

@Injectable()
export class DepositsService {
  constructor(
    @Inject(DEPOSIT_REPOSITORY) private readonly deposits: DepositRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
  ) {}

  async listPending(organizationId: string): Promise<DepositView[]> {
    const all = await this.deposits.listPending(organizationId);
    return all.map(toDepositView);
  }

  /** Confirm the deposit and the appointment together (BR-105). */
  confirm(
    organizationId: string,
    depositId: string,
    confirmedByUserId: string,
  ): Promise<DepositView> {
    return this.resolve(organizationId, depositId, (deposit, appointment, now) => {
      deposit.confirm(confirmedByUserId, now);
      appointment.confirmViaDeposit(now);
    });
  }

  /** Reject the deposit and the appointment together (BR-106). */
  reject(organizationId: string, depositId: string): Promise<DepositView> {
    return this.resolve(organizationId, depositId, (deposit, appointment, now) => {
      deposit.reject(now);
      appointment.rejectViaDeposit(now);
    });
  }

  private async resolve(
    organizationId: string,
    depositId: string,
    apply: (deposit: Deposit, appointment: Appointment, now: Date) => void,
  ): Promise<DepositView> {
    const deposit = await this.deposits.findById(organizationId, depositId);
    if (!deposit) {
      throw new NotFoundError('Seña no encontrada');
    }
    const appointment = await this.appointments.findById(organizationId, deposit.appointmentId);
    if (!appointment) {
      throw new NotFoundError('Turno no encontrado');
    }
    const now = this.clock.now();
    const events = await this.uow.run(async () => {
      apply(deposit, appointment, now);
      await this.deposits.save(deposit);
      await this.appointments.save(appointment);
      return [...deposit.pullEvents(), ...appointment.pullEvents()];
    });
    await this.publisher.publishAll(events);
    return toDepositView(deposit);
  }
}

function toDepositView(deposit: Deposit): DepositView {
  const s = deposit.snapshot;
  return {
    id: deposit.id,
    appointmentId: s.appointmentId,
    expectedAmount: s.expectedAmount.toNumber(),
    receivedAmount: s.receivedAmount === null ? null : s.receivedAmount.toNumber(),
    status: s.status,
    requestedAt: s.requestedAt,
    confirmedAt: s.confirmedAt,
    confirmedBy: s.confirmedBy,
  };
}
