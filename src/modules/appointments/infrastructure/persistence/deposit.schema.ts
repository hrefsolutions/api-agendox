import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Mirrors {@link DepositStatus}. */
export const depositStatusEnum = pgEnum('deposit_status', [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'EXPIRED',
]);

export const deposits = pgTable(
  'deposits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    appointmentId: uuid('appointment_id').notNull(),
    expectedAmount: numeric('expected_amount', { precision: 12, scale: 2 }).notNull(),
    receivedAmount: numeric('received_amount', { precision: 12, scale: 2 }),
    status: depositStatusEnum('status').notNull().default('PENDING'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by'),
    notes: text('notes'),
  },
  (table) => [
    index('deposits_org_appointment_status_idx').on(
      table.organizationId,
      table.appointmentId,
      table.status,
    ),
    // Only one active (PENDING) deposit per appointment.
    uniqueIndex('deposits_one_active_per_appointment')
      .on(table.appointmentId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

export type DepositRow = typeof deposits.$inferSelect;
export type NewDepositRow = typeof deposits.$inferInsert;
