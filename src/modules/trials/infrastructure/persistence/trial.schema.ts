import { index, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Mirrors {@link TrialStatus}. */
export const trialStatusEnum = pgEnum('trial_status', ['ACTIVE', 'EXPIRED', 'CONVERTED']);

export const trials = pgTable(
  'trials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    status: trialStatusEnum('status').notNull().default('ACTIVE'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('trials_organization_idx').on(table.organizationId)],
);

export type TrialRow = typeof trials.$inferSelect;
export type NewTrialRow = typeof trials.$inferInsert;
