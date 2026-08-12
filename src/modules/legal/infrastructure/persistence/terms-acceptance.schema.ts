import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Aceptaciones de los Términos y Condiciones por organización.
 *
 * Es una tabla de historial, no un flag: guarda **una fila por versión
 * aceptada**. Un par de columnas en `organizations` sería más corto, pero al
 * aceptar una versión nueva se perdería el registro de la anterior, y el valor
 * probatorio de todo esto es justamente poder decir qué texto aceptaron, quién
 * y cuándo. Las filas no se actualizan ni se borran.
 */
export const termsAcceptances = pgTable(
  'terms_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    /** Usuario que aceptó. Siempre el Owner (es el único que puede). */
    userId: uuid('user_id').notNull(),
    /** Versión del documento, con el formato de {@link CURRENT_TERMS_VERSION}. */
    version: varchar('version', { length: 32 }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
    /** IPv6 entra en 45 caracteres; 64 deja aire para prefijos de proxy. */
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
  },
  (table) => [
    // Una sola aceptación por versión: hace idempotente el POST.
    uniqueIndex('terms_acceptances_org_version_uq').on(table.organizationId, table.version),
    index('terms_acceptances_org_accepted_at_idx').on(table.organizationId, table.acceptedAt),
  ],
);

export type TermsAcceptanceRow = typeof termsAcceptances.$inferSelect;
export type NewTermsAcceptanceRow = typeof termsAcceptances.$inferInsert;
