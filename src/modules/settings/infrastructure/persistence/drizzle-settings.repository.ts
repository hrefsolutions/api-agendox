import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { SettingsRepository } from '../../domain/settings.repository';
import {
  DepositType,
  type BookingSettings,
  type BrandingSettings,
  type BusinessHour,
  type BusinessSettings,
  type NotificationSettings,
  type PaymentSettings,
} from '../../domain/settings.types';
import {
  bookingSettings,
  brandingSettings,
  businessHours,
  businessSettings,
  notificationSettings,
  paymentSettings,
} from './settings.schema';

@Injectable()
export class DrizzleSettingsRepository extends BaseDrizzleRepository implements SettingsRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async getBusiness(organizationId: string): Promise<BusinessSettings | null> {
    const rows = await this.executor
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertBusiness(value: BusinessSettings): Promise<void> {
    await this.executor
      .insert(businessSettings)
      .values(value)
      .onConflictDoUpdate({
        target: businessSettings.organizationId,
        set: {
          businessName: value.businessName,
          timezone: value.timezone,
          contactEmail: value.contactEmail,
          contactPhone: value.contactPhone,
          address: value.address,
          locale: value.locale,
        },
      });
  }

  async getBooking(organizationId: string): Promise<BookingSettings | null> {
    const rows = await this.executor
      .select()
      .from(bookingSettings)
      .where(eq(bookingSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertBooking(value: BookingSettings): Promise<void> {
    await this.executor
      .insert(bookingSettings)
      .values(value)
      .onConflictDoUpdate({
        target: bookingSettings.organizationId,
        set: {
          publicBookingEnabled: value.publicBookingEnabled,
          slotGranularityMinutes: value.slotGranularityMinutes,
          minNoticeMinutes: value.minNoticeMinutes,
          maxAdvanceDays: value.maxAdvanceDays,
          cancellationPolicy: value.cancellationPolicy,
          requiresManualApproval: value.requiresManualApproval,
        },
      });
  }

  async getPayment(organizationId: string): Promise<PaymentSettings | null> {
    const rows = await this.executor
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.organizationId, organizationId))
      .limit(1);
    const row = rows[0];
    return row ? { ...row, depositType: row.depositType as DepositType | null } : null;
  }

  async upsertPayment(value: PaymentSettings): Promise<void> {
    await this.executor
      .insert(paymentSettings)
      .values(value)
      .onConflictDoUpdate({
        target: paymentSettings.organizationId,
        set: {
          depositEnabled: value.depositEnabled,
          depositType: value.depositType,
          depositValue: value.depositValue,
          depositTtlHours: value.depositTtlHours,
          bankName: value.bankName,
          accountHolder: value.accountHolder,
          alias: value.alias,
          cbu: value.cbu,
          phone: value.phone,
          instructions: value.instructions,
        },
      });
  }

  async getNotification(organizationId: string): Promise<NotificationSettings | null> {
    const rows = await this.executor
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertNotification(value: NotificationSettings): Promise<void> {
    await this.executor
      .insert(notificationSettings)
      .values(value)
      .onConflictDoUpdate({
        target: notificationSettings.organizationId,
        set: {
          emailEnabled: value.emailEnabled,
          whatsappEnabled: value.whatsappEnabled,
          remindersEnabled: value.remindersEnabled,
          reminderHoursBefore: value.reminderHoursBefore,
          templates: value.templates,
        },
      });
  }

  async getBranding(organizationId: string): Promise<BrandingSettings | null> {
    const rows = await this.executor
      .select()
      .from(brandingSettings)
      .where(eq(brandingSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertBranding(value: BrandingSettings): Promise<void> {
    await this.executor
      .insert(brandingSettings)
      .values(value)
      .onConflictDoUpdate({
        target: brandingSettings.organizationId,
        set: {
          logoUrl: value.logoUrl,
          primaryColor: value.primaryColor,
          secondaryColor: value.secondaryColor,
          publicTitle: value.publicTitle,
          publicDescription: value.publicDescription,
        },
      });
  }

  async getBusinessHours(organizationId: string): Promise<BusinessHour[]> {
    const rows = await this.executor
      .select()
      .from(businessHours)
      .where(eq(businessHours.organizationId, organizationId))
      .orderBy(asc(businessHours.dayOfWeek));
    return rows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      isClosed: row.isClosed,
      validFrom: row.validFrom,
      validTo: row.validTo,
    }));
  }

  async replaceBusinessHours(organizationId: string, hours: BusinessHour[]): Promise<void> {
    await this.executor
      .delete(businessHours)
      .where(eq(businessHours.organizationId, organizationId));
    if (hours.length === 0) return;
    await this.executor.insert(businessHours).values(
      hours.map((hour) => ({
        id: randomUUID(),
        organizationId,
        dayOfWeek: hour.dayOfWeek,
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
        isClosed: hour.isClosed,
        validFrom: hour.validFrom,
        validTo: hour.validTo,
      })),
    );
  }
}
