import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Platform operators (global; no `organization_id`). */
export const superAdmins = pgTable(
  'super_admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('super_admins_email_uq').on(table.email)],
);

export type SuperAdminRow = typeof superAdmins.$inferSelect;
export type NewSuperAdminRow = typeof superAdmins.$inferInsert;
