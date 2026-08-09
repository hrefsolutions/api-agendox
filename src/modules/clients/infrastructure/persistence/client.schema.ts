import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Mirrors {@link ClientStatus}. */
export const clientStatusEnum = pgEnum('client_status', ['ACTIVE', 'INACTIVE']);

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    whatsapp: text('whatsapp').notNull(),
    phone: text('phone'),
    notes: text('notes'),
    status: clientStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Email identifies a client within its organization (BR-032).
    uniqueIndex('clients_org_email_uq').on(table.organizationId, table.email),
    index('clients_org_idx').on(table.organizationId),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
