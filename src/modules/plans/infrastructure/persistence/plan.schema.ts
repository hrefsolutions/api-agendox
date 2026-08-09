import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Mirrors {@link PlanStatus}. */
export const planStatusEnum = pgEnum('plan_status', ['ACTIVE', 'INACTIVE']);

/** Global commercial plans (no `organization_id`). */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('ARS'),
    billingPeriod: text('billing_period').notNull(),
    features: jsonb('features').$type<Record<string, unknown>>().notNull().default({}),
    limits: jsonb('limits').$type<Record<string, unknown>>().notNull().default({}),
    status: planStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('plans_name_uq').on(table.name)],
);

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
