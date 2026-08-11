import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * 1:1 with organization: qué funcionalidades tiene habilitadas cada negocio.
 *
 * Vive aparte de `business_settings` porque el dueño es distinto: esto lo
 * gobierna el super admin y el negocio no lo puede tocar. Sirve para tres cosas
 * que hoy necesitamos: apagar features que todavía no están implementadas
 * (WhatsApp), habilitar de a poco las que dependen de infraestructura que
 * todavía no tenemos (subida de imágenes), y decidir qué secciones del panel ve
 * cada negocio (suscripciones).
 *
 * El default de cada flag es el estado en que conviene dejar a una organización
 * nueva, y **no** es el mismo para todos: lo que no existe todavía arranca
 * apagado, y lo que ya funciona arranca prendido.
 */
export const organizationFeatures = pgTable('organization_features', {
  organizationId: uuid('organization_id').primaryKey(),
  /** Canal de notificaciones por WhatsApp. Pendiente de implementación. */
  whatsappNotifications: boolean('whatsapp_notifications').notNull().default(false),
  /** Subida de logo como archivo (además del logo por URL, que siempre está). */
  logoUpload: boolean('logo_upload').notNull().default(false),
  /**
   * Sección de Suscripción en el panel del negocio. Arranca en `true` porque el
   * cobro es el modelo por defecto; se apaga para cuentas de cortesía, internas
   * o de demo, donde ofrecer un checkout no tiene sentido.
   */
  subscriptionsEnabled: boolean('subscriptions_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OrganizationFeaturesRow = typeof organizationFeatures.$inferSelect;
