import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Mirrors {@link AppointmentStatus}. */
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'PENDING_DEPOSIT',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'NO_SHOW',
]);

/** Mirrors {@link AppointmentSource}. */
export const appointmentSourceEnum = pgEnum('appointment_source', ['PUBLIC', 'INTERNAL']);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    // Snapshot at booking time — never recalculated (BR-081/BR-160).
    serviceId: uuid('service_id').notNull(),
    serviceName: text('service_name').notNull(),
    serviceOptionId: uuid('service_option_id').notNull(),
    serviceOptionName: text('service_option_name').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    servicePrice: numeric('service_price', { precision: 12, scale: 2 }).notNull(),
    resourceId: uuid('resource_id').notNull(),
    resourceName: text('resource_name').notNull(),
    clientId: uuid('client_id').notNull(),
    clientName: text('client_name').notNull(),
    clientPhone: text('client_phone').notNull(),
    clientEmail: text('client_email').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }).notNull(),
    remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull(),
    status: appointmentStatusEnum('status').notNull(),
    source: appointmentSourceEnum('source').notNull(),
    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),
    // Client-supplied key to make public bookings idempotent (double-submit safe).
    idempotencyKey: uuid('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One appointment per (org, idempotency key); staff bookings pass NULL (unconstrained).
    uniqueIndex('appointments_idempotency_uq')
      .on(table.organizationId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index('appointments_org_resource_starts_idx').on(
      table.organizationId,
      table.resourceId,
      table.startsAt,
    ),
    index('appointments_org_client_starts_idx').on(
      table.organizationId,
      table.clientId,
      table.startsAt,
    ),
    index('appointments_org_status_starts_idx').on(
      table.organizationId,
      table.status,
      table.startsAt,
    ),
    check('appointments_valid_range', sql`${table.endsAt} > ${table.startsAt}`),
    check('appointments_duration_positive', sql`${table.durationMinutes} > 0`),
  ],
);

export type AppointmentRow = typeof appointments.$inferSelect;
export type NewAppointmentRow = typeof appointments.$inferInsert;
