import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lt } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { DepositStatus } from '../../domain/deposit-status.enum';
import type { Deposit } from '../../domain/entities/deposit.entity';
import type { DepositRepository } from '../../domain/repositories/deposit.repository';
import { DepositMapper } from '../mappers/deposit.mapper';
import { deposits } from './deposit.schema';

@Injectable()
export class DrizzleDepositRepository extends BaseDrizzleRepository implements DepositRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(deposit: Deposit): Promise<void> {
    const row = DepositMapper.toRow(deposit);
    await this.executor
      .insert(deposits)
      .values(row)
      .onConflictDoUpdate({
        target: deposits.id,
        set: {
          status: row.status,
          receivedAmount: row.receivedAmount,
          confirmedAt: row.confirmedAt,
          confirmedBy: row.confirmedBy,
          notes: row.notes,
        },
      });
  }

  async findById(organizationId: string, id: string): Promise<Deposit | null> {
    const rows = await this.executor
      .select()
      .from(deposits)
      .where(and(eq(deposits.organizationId, organizationId), eq(deposits.id, id)))
      .limit(1);
    return rows[0] ? DepositMapper.toDomain(rows[0]) : null;
  }

  async findActiveByAppointment(
    organizationId: string,
    appointmentId: string,
  ): Promise<Deposit | null> {
    const rows = await this.executor
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.organizationId, organizationId),
          eq(deposits.appointmentId, appointmentId),
          eq(deposits.status, DepositStatus.Pending),
        ),
      )
      .limit(1);
    return rows[0] ? DepositMapper.toDomain(rows[0]) : null;
  }

  async listPending(organizationId: string): Promise<Deposit[]> {
    const rows = await this.executor
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.organizationId, organizationId),
          eq(deposits.status, DepositStatus.Pending),
        ),
      )
      .orderBy(asc(deposits.requestedAt));
    return rows.map((row) => DepositMapper.toDomain(row));
  }

  async findExpired(now: Date, limit: number): Promise<Deposit[]> {
    const rows = await this.executor
      .select()
      .from(deposits)
      .where(and(eq(deposits.status, DepositStatus.Pending), lt(deposits.expiresAt, now)))
      .orderBy(asc(deposits.expiresAt))
      .limit(limit);
    return rows.map((row) => DepositMapper.toDomain(row));
  }
}
