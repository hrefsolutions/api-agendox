import { Money } from '@shared/domain';

import { Deposit } from '../../domain/entities/deposit.entity';
import { DepositStatus } from '../../domain/deposit-status.enum';
import type { DepositRow, NewDepositRow } from '../persistence/deposit.schema';

export class DepositMapper {
  static toDomain(row: DepositRow): Deposit {
    return Deposit.fromPersistence(row.id, {
      organizationId: row.organizationId,
      appointmentId: row.appointmentId,
      expectedAmount: Money.fromDecimalString(row.expectedAmount),
      receivedAmount:
        row.receivedAmount === null ? null : Money.fromDecimalString(row.receivedAmount),
      status: row.status as DepositStatus,
      requestedAt: row.requestedAt,
      // Legacy rows (pre-MS6) have no expiry; fall back to requestedAt.
      expiresAt: row.expiresAt ?? row.requestedAt,
      confirmedAt: row.confirmedAt,
      confirmedBy: row.confirmedBy,
      notes: row.notes,
    });
  }

  static toRow(deposit: Deposit): NewDepositRow {
    const s = deposit.snapshot;
    return {
      id: deposit.id,
      organizationId: s.organizationId,
      appointmentId: s.appointmentId,
      expectedAmount: s.expectedAmount.toDecimalString(),
      receivedAmount: s.receivedAmount === null ? null : s.receivedAmount.toDecimalString(),
      status: s.status,
      requestedAt: s.requestedAt,
      expiresAt: s.expiresAt,
      confirmedAt: s.confirmedAt,
      confirmedBy: s.confirmedBy,
      notes: s.notes,
    };
  }
}
