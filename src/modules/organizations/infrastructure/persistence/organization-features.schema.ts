import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * 1:1 with organization: qué funcionalidades tiene habilitadas cada negocio.
 *
 * Vive aparte de `business_settings` porque el dueño es distinto: esto lo
 * gobierna el super admin y el negocio no lo puede tocar. Sirve para dos cosas
 * que hoy necesitamos: apagar features que todavía no están implementadas
 * (WhatsApp) y habilitar de a poco las que dependen de infraestructura que
 * todavía no tenemos (subida de imágenes).
 *
 * Los flags arrancan en `false`: una organización sin fila en esta tabla no
 * tiene nada extra habilitado, que es el default seguro.
 */
export const organizationFeatures = pgTable('organization_features', {
  organizationId: uuid('organization_id').primaryKey(),
  /** Canal de notificaciones por WhatsApp. Pendiente de implementación. */
  whatsappNotifications: boolean('whatsapp_notifications').notNull().default(false),
  /** Subida de logo como archivo (además del logo por URL, que siempre está). */
  logoUpload: boolean('logo_upload').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrganizationFeaturesRow = typeof organizationFeatures.$inferSelect;
