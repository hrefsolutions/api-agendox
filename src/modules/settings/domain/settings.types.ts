export enum DepositType {
  Fixed = 'FIXED',
  Percentage = 'PERCENTAGE',
}

export interface BusinessSettings {
  organizationId: string;
  businessName: string;
  timezone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  locale: string;
}

export interface BookingSettings {
  organizationId: string;
  publicBookingEnabled: boolean;
  slotGranularityMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  cancellationPolicy: string | null;
  requiresManualApproval: boolean;
}

export interface PaymentSettings {
  organizationId: string;
  depositEnabled: boolean;
  depositType: DepositType | null;
  depositValue: string | null;
  /** Hours a pending deposit stays valid before expiry. Null → global default. */
  depositTtlHours: number | null;
  bankName: string | null;
  accountHolder: string | null;
  alias: string | null;
  cbu: string | null;
  phone: string | null;
  instructions: string | null;
}

export interface NotificationSettings {
  organizationId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  remindersEnabled: boolean;
  reminderHoursBefore: number;
  templates: Record<string, unknown>;
}

export interface BrandingSettings {
  organizationId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  publicTitle: string | null;
  publicDescription: string | null;
}

export interface BusinessHour {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  validFrom: string | null;
  validTo: string | null;
}
