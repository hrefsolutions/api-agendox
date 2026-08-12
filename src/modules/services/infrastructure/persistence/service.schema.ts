import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('services_org_name_uq').on(table.organizationId, table.name),
    index('services_org_active_idx').on(table.organizationId, table.active),
  ],
);

export const serviceOptions = pgTable(
  'service_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    /** Qué es la opción ("Corte simple"). Sin esto el cliente solo ve duración y precio. */
    name: text('name').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('service_options_org_service_active_idx').on(
      table.organizationId,
      table.serviceId,
      table.active,
    ),
    check('service_options_duration_positive', sql`${table.durationMinutes} > 0`),
    check('service_options_price_non_negative', sql`${table.price} >= 0`),
  ],
);

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
export type ServiceOptionRow = typeof serviceOptions.$inferSelect;
export type NewServiceOptionRow = typeof serviceOptions.$inferInsert;
