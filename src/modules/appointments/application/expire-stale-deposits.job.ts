import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';

import {
  CLOCK,
  DOMAIN_EVENT_PUBLISHER,
  UNIT_OF_WORK,
  type Clock,
  type DomainEventPublisher,
  type UnitOfWork,
} from '@shared/application';
import type { DomainEvent } from '@shared/domain';

import { AppointmentStatus } from '../domain/appointment-status.enum';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '../domain/repositories/appointment.repository';
import {
  DEPOSIT_REPOSITORY,
  type DepositRepository,
} from '../domain/repositories/deposit.repository';

const BATCH_SIZE = 100;

/**
 * Periodically expires PENDING deposits whose per-org TTL has elapsed (the
 * expiry instant is captured on each deposit at creation) and cancels their
 * still-PENDING_DEPOSIT appointment, releasing the slot. Idempotent per row.
 * Single-instance for the MVP; add a `pg_advisory_lock` before scaling out.
 */
@Injectable()
export class ExpireStaleDeposits {
  constructor(
    @Inject(DEPOSIT_REPOSITORY) private readonly deposits: DepositRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    const now = this.clock.now();
    const stale = await this.deposits.findExpired(now, BATCH_SIZE);
    if (stale.length === 0) return;

    for (const deposit of stale) {
      const appointment = await this.appointments.findById(
        deposit.organizationId,
        deposit.appointmentId,
      );
      const events = await this.uow.run(async () => {
        deposit.expire(now);
        await this.deposits.save(deposit);
        const collected: DomainEvent[] = [...deposit.pullEvents()];
        if (appointment && appointment.status === AppointmentStatus.PendingDeposit) {
          appointment.cancel('SYSTEM', 'Deposit expired', now);
          await this.appointments.save(appointment);
          collected.push(...appointment.pullEvents());
        }
        return collected;
      });
      await this.publisher.publishAll(events);
    }
    this.logger.log(`Expired ${stale.length} stale deposit(s)`);
  }
}
