import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Mirrors the {@link Role} enum (docs/05-roles-permisos.md). */
export const userRoleEnum = pgEnum('user_role', [
  'OWNER',
  'ADMIN',
  'RECEPTIONIST',
  'RESOURCE_OPERATOR',
]);

/** Mirrors {@link UserStatus}. */
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    role: userRoleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    index('users_organization_idx').on(table.organizationId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
