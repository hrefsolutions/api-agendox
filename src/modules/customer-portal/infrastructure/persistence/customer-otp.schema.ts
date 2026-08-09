import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const customerOtps = pgTable(
  'customer_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('customer_otps_org_email_idx').on(table.organizationId, table.email)],
);

export type CustomerOtpRow = typeof customerOtps.$inferSelect;
export type NewCustomerOtpRow = typeof customerOtps.$inferInsert;
