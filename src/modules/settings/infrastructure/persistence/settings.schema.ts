import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  uuid,
} from 'drizzle-orm/pg-core';

/** Deposit policy kind (docs/06-entidades.md PaymentSettings). */
export const depositTypeEnum = pgEnum('deposit_type', ['FIXED', 'PERCENTAGE']);

/** 1:1 with organization: general business info. */
export const businessSettings = pgTable('business_settings', {
  organizationId: uuid('organization_id').primaryKey(),
  businessName: text('business_name').notNull(),
  timezone: text('timezone').notNull(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  locale: text('locale').notNull().default('es-AR'),
});

/** 1:1 with organization: public booking rules (feeds the availability engine). */
export const bookingSettings = pgTable('booking_settings', {
  organizationId: uuid('organization_id').primaryKey(),
  publicBookingEnabled: boolean('public_booking_enabled').notNull().default(true),
  slotGranularityMinutes: integer('slot_granularity_minutes').notNull().default(15),
  minNoticeMinutes: integer('min_notice_minutes').notNull().default(120),
  maxAdvanceDays: integer('max_advance_days').notNull().default(60),
  cancellationPolicy: text('cancellation_policy'),
  requiresManualApproval: boolean('requires_manual_approval').notNull().default(false),
});

/** 1:1 with organization: deposit policy + bank transfer data. */
export const paymentSettings = pgTable('payment_settings', {
  organizationId: uuid('organization_id').primaryKey(),
  depositEnabled: boolean('deposit_enabled').notNull().default(false),
  depositType: depositTypeEnum('deposit_type'),
  depositValue: numeric('deposit_value', { precision: 12, scale: 2 }),
  depositTtlHours: integer('deposit_ttl_hours'),
  bankName: text('bank_name'),
  accountHolder: text('account_holder'),
  alias: text('alias'),
  cbu: text('cbu'),
  phone: text('phone'),
  instructions: text('instructions'),
});

/** 1:1 with organization: notification preferences. */
export const notificationSettings = pgTable('notification_settings', {
  organizationId: uuid('organization_id').primaryKey(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
  remindersEnabled: boolean('reminders_enabled').notNull().default(true),
  reminderHoursBefore: integer('reminder_hours_before').notNull().default(24),
  templates: jsonb('templates').$type<Record<string, unknown>>().notNull().default({}),
});

/** 1:1 with organization: public branding. */
export const brandingSettings = pgTable('branding_settings', {
  organizationId: uuid('organization_id').primaryKey(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  publicTitle: text('public_title'),
  publicDescription: text('public_description'),
});

/** 1:N with organization: opening hours per weekday (local wall-clock time). */
export const businessHours = pgTable(
  'business_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    dayOfWeek: smallint('day_of_week').notNull(),
    opensAt: time('opens_at'),
    closesAt: time('closes_at'),
    isClosed: boolean('is_closed').notNull().default(false),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
  },
  (table) => [index('business_hours_org_dow_idx').on(table.organizationId, table.dayOfWeek)],
);

export type BusinessSettingsRow = typeof businessSettings.$inferSelect;
export type BookingSettingsRow = typeof bookingSettings.$inferSelect;
export type PaymentSettingsRow = typeof paymentSettings.$inferSelect;
export type NotificationSettingsRow = typeof notificationSettings.$inferSelect;
export type BrandingSettingsRow = typeof brandingSettings.$inferSelect;
export type BusinessHourRow = typeof businessHours.$inferSelect;
