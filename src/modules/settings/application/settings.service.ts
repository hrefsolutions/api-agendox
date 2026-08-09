import { Inject, Injectable } from '@nestjs/common';

import { UNIT_OF_WORK, type UnitOfWork } from '@shared/application';
import { ValidationError } from '@shared/errors';

import { SETTINGS_REPOSITORY, type SettingsRepository } from '../domain/settings.repository';
import {
  DepositType,
  type BookingSettings,
  type BrandingSettings,
  type BusinessHour,
  type BusinessSettings,
  type NotificationSettings,
  type PaymentSettings,
} from '../domain/settings.types';

/** Values a caller may set, keyed without the (tenant-derived) organizationId. */
type Without<T> = Omit<T, 'organizationId'>;

/**
 * Coordinates the tenant's configuration records. Settings hold only trivial
 * invariants, so a thin application service (rather than aggregates) keeps the
 * module simple while remaining tenant-scoped and transactional where needed.
 */
@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly repository: SettingsRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
  ) {}

  async getBusiness(organizationId: string): Promise<BusinessSettings> {
    return (
      (await this.repository.getBusiness(organizationId)) ?? {
        organizationId,
        businessName: '',
        timezone: 'UTC',
        contactEmail: null,
        contactPhone: null,
        address: null,
        locale: 'es-AR',
      }
    );
  }

  async updateBusiness(
    organizationId: string,
    value: Without<BusinessSettings>,
  ): Promise<BusinessSettings> {
    const merged: BusinessSettings = { organizationId, ...value };
    await this.repository.upsertBusiness(merged);
    return merged;
  }

  async getBooking(organizationId: string): Promise<BookingSettings> {
    return (await this.repository.getBooking(organizationId)) ?? defaultBooking(organizationId);
  }

  async updateBooking(
    organizationId: string,
    value: Without<BookingSettings>,
  ): Promise<BookingSettings> {
    const merged: BookingSettings = { organizationId, ...value };
    await this.repository.upsertBooking(merged);
    return merged;
  }

  async getPayment(organizationId: string): Promise<PaymentSettings> {
    return (await this.repository.getPayment(organizationId)) ?? defaultPayment(organizationId);
  }

  async updatePayment(
    organizationId: string,
    value: Without<PaymentSettings>,
  ): Promise<PaymentSettings> {
    if (value.depositEnabled) {
      if (!value.depositType) {
        throw new ValidationError('depositType es obligatorio cuando las señas están habilitadas');
      }
      const amount = value.depositValue === null ? NaN : Number(value.depositValue);
      if (Number.isNaN(amount) || amount <= 0) {
        throw new ValidationError(
          'depositValue debe ser un número positivo cuando las señas están habilitadas',
        );
      }
      if (value.depositType === DepositType.Percentage && amount > 100) {
        throw new ValidationError('Una seña porcentual debe estar entre 0 y 100');
      }
    }
    const merged: PaymentSettings = { organizationId, ...value };
    await this.repository.upsertPayment(merged);
    return merged;
  }

  async getNotification(organizationId: string): Promise<NotificationSettings> {
    return (
      (await this.repository.getNotification(organizationId)) ?? defaultNotification(organizationId)
    );
  }

  async updateNotification(
    organizationId: string,
    value: Without<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const merged: NotificationSettings = { organizationId, ...value };
    await this.repository.upsertNotification(merged);
    return merged;
  }

  async getBranding(organizationId: string): Promise<BrandingSettings> {
    return (
      (await this.repository.getBranding(organizationId)) ?? {
        organizationId,
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
        publicTitle: null,
        publicDescription: null,
      }
    );
  }

  async updateBranding(
    organizationId: string,
    value: Without<BrandingSettings>,
  ): Promise<BrandingSettings> {
    const merged: BrandingSettings = { organizationId, ...value };
    await this.repository.upsertBranding(merged);
    return merged;
  }

  getBusinessHours(organizationId: string): Promise<BusinessHour[]> {
    return this.repository.getBusinessHours(organizationId);
  }

  async replaceBusinessHours(
    organizationId: string,
    hours: BusinessHour[],
  ): Promise<BusinessHour[]> {
    await this.uow.run(() => this.repository.replaceBusinessHours(organizationId, hours));
    return this.repository.getBusinessHours(organizationId);
  }

  /**
   * Seeds all default settings for a brand-new organization. Must run inside an
   * existing transaction (e.g. RegisterOrganization's unit of work).
   */
  async initializeDefaults(input: {
    organizationId: string;
    businessName: string;
    timezone: string;
  }): Promise<void> {
    const { organizationId, businessName, timezone } = input;
    await this.repository.upsertBusiness({
      organizationId,
      businessName,
      timezone,
      contactEmail: null,
      contactPhone: null,
      address: null,
      locale: 'es-AR',
    });
    await this.repository.upsertBooking(defaultBooking(organizationId));
    await this.repository.upsertPayment(defaultPayment(organizationId));
    await this.repository.upsertNotification(defaultNotification(organizationId));
    await this.repository.upsertBranding({
      organizationId,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      publicTitle: businessName,
      publicDescription: null,
    });
    await this.repository.replaceBusinessHours(organizationId, defaultBusinessHours());
  }
}

function defaultBooking(organizationId: string): BookingSettings {
  return {
    organizationId,
    publicBookingEnabled: true,
    slotGranularityMinutes: 15,
    minNoticeMinutes: 120,
    maxAdvanceDays: 60,
    cancellationPolicy: null,
    requiresManualApproval: false,
  };
}

function defaultPayment(organizationId: string): PaymentSettings {
  return {
    organizationId,
    depositEnabled: false,
    depositType: null,
    depositValue: null,
    depositTtlHours: null,
    bankName: null,
    accountHolder: null,
    alias: null,
    cbu: null,
    phone: null,
    instructions: null,
  };
}

function defaultNotification(organizationId: string): NotificationSettings {
  return {
    organizationId,
    emailEnabled: true,
    whatsappEnabled: false,
    remindersEnabled: true,
    reminderHoursBefore: 24,
    templates: {},
  };
}

/** Mon–Sat 09:00–18:00 open, Sunday closed. Day of week: 0=Sunday…6=Saturday. */
function defaultBusinessHours(): BusinessHour[] {
  return Array.from({ length: 7 }, (_unused, dayOfWeek) => {
    const isClosed = dayOfWeek === 0;
    return {
      dayOfWeek,
      opensAt: isClosed ? null : '09:00:00',
      closesAt: isClosed ? null : '18:00:00',
      isClosed,
      validFrom: null,
      validTo: null,
    };
  });
}
