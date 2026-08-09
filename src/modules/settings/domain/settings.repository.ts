import type {
  BookingSettings,
  BrandingSettings,
  BusinessHour,
  BusinessSettings,
  NotificationSettings,
  PaymentSettings,
} from './settings.types';

/**
 * Persistence contract for a tenant's configuration. Every method is tenant
 * scoped by `organizationId`. The 1:1 settings are upserted by organization id.
 */
export interface SettingsRepository {
  getBusiness(organizationId: string): Promise<BusinessSettings | null>;
  upsertBusiness(value: BusinessSettings): Promise<void>;

  getBooking(organizationId: string): Promise<BookingSettings | null>;
  upsertBooking(value: BookingSettings): Promise<void>;

  getPayment(organizationId: string): Promise<PaymentSettings | null>;
  upsertPayment(value: PaymentSettings): Promise<void>;

  getNotification(organizationId: string): Promise<NotificationSettings | null>;
  upsertNotification(value: NotificationSettings): Promise<void>;

  getBranding(organizationId: string): Promise<BrandingSettings | null>;
  upsertBranding(value: BrandingSettings): Promise<void>;

  getBusinessHours(organizationId: string): Promise<BusinessHour[]>;
  replaceBusinessHours(organizationId: string, hours: BusinessHour[]): Promise<void>;
}

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');
