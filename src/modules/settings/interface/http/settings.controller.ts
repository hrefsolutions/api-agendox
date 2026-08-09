import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import { SettingsService } from '../../application/settings.service';
import type {
  BookingSettings,
  BrandingSettings,
  BusinessHour,
  BusinessSettings,
  NotificationSettings,
  PaymentSettings,
} from '../../domain/settings.types';
import {
  SetBusinessHoursRequest,
  UpdateBookingSettingsRequest,
  UpdateBrandingSettingsRequest,
  UpdateBusinessSettingsRequest,
  UpdateNotificationSettingsRequest,
  UpdatePaymentSettingsRequest,
} from './settings.requests';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('business')
  getBusiness(@TenantId() organizationId: string): Promise<BusinessSettings> {
    return this.settings.getBusiness(organizationId);
  }

  @Put('business')
  @Roles(Role.Owner, Role.Admin)
  updateBusiness(
    @TenantId() organizationId: string,
    @Body() body: UpdateBusinessSettingsRequest,
  ): Promise<BusinessSettings> {
    return this.settings.updateBusiness(organizationId, {
      businessName: body.businessName,
      timezone: body.timezone,
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      address: body.address ?? null,
      locale: body.locale ?? 'es-AR',
    });
  }

  @Get('booking')
  getBooking(@TenantId() organizationId: string): Promise<BookingSettings> {
    return this.settings.getBooking(organizationId);
  }

  @Put('booking')
  @Roles(Role.Owner, Role.Admin)
  updateBooking(
    @TenantId() organizationId: string,
    @Body() body: UpdateBookingSettingsRequest,
  ): Promise<BookingSettings> {
    return this.settings.updateBooking(organizationId, {
      publicBookingEnabled: body.publicBookingEnabled,
      slotGranularityMinutes: body.slotGranularityMinutes,
      minNoticeMinutes: body.minNoticeMinutes,
      maxAdvanceDays: body.maxAdvanceDays,
      cancellationPolicy: body.cancellationPolicy ?? null,
      requiresManualApproval: body.requiresManualApproval,
    });
  }

  @Get('payment')
  @Roles(Role.Owner, Role.Admin)
  getPayment(@TenantId() organizationId: string): Promise<PaymentSettings> {
    return this.settings.getPayment(organizationId);
  }

  @Put('payment')
  @Roles(Role.Owner)
  updatePayment(
    @TenantId() organizationId: string,
    @Body() body: UpdatePaymentSettingsRequest,
  ): Promise<PaymentSettings> {
    return this.settings.updatePayment(organizationId, {
      depositEnabled: body.depositEnabled,
      depositType: body.depositType ?? null,
      depositValue: body.depositValue ?? null,
      depositTtlHours: body.depositTtlHours ?? null,
      bankName: body.bankName ?? null,
      accountHolder: body.accountHolder ?? null,
      alias: body.alias ?? null,
      cbu: body.cbu ?? null,
      phone: body.phone ?? null,
      instructions: body.instructions ?? null,
    });
  }

  @Get('notifications')
  getNotification(@TenantId() organizationId: string): Promise<NotificationSettings> {
    return this.settings.getNotification(organizationId);
  }

  @Put('notifications')
  @Roles(Role.Owner, Role.Admin)
  updateNotification(
    @TenantId() organizationId: string,
    @Body() body: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettings> {
    return this.settings.updateNotification(organizationId, {
      emailEnabled: body.emailEnabled,
      whatsappEnabled: body.whatsappEnabled,
      remindersEnabled: body.remindersEnabled,
      reminderHoursBefore: body.reminderHoursBefore,
      templates: body.templates ?? {},
    });
  }

  @Get('branding')
  getBranding(@TenantId() organizationId: string): Promise<BrandingSettings> {
    return this.settings.getBranding(organizationId);
  }

  @Put('branding')
  @Roles(Role.Owner, Role.Admin)
  updateBranding(
    @TenantId() organizationId: string,
    @Body() body: UpdateBrandingSettingsRequest,
  ): Promise<BrandingSettings> {
    return this.settings.updateBranding(organizationId, {
      logoUrl: body.logoUrl ?? null,
      primaryColor: body.primaryColor ?? null,
      secondaryColor: body.secondaryColor ?? null,
      publicTitle: body.publicTitle ?? null,
      publicDescription: body.publicDescription ?? null,
    });
  }

  @Get('business-hours')
  getBusinessHours(@TenantId() organizationId: string): Promise<BusinessHour[]> {
    return this.settings.getBusinessHours(organizationId);
  }

  @Put('business-hours')
  @Roles(Role.Owner, Role.Admin)
  setBusinessHours(
    @TenantId() organizationId: string,
    @Body() body: SetBusinessHoursRequest,
  ): Promise<BusinessHour[]> {
    const hours: BusinessHour[] = body.hours.map((hour) => ({
      dayOfWeek: hour.dayOfWeek,
      opensAt: hour.opensAt ?? null,
      closesAt: hour.closesAt ?? null,
      isClosed: hour.isClosed,
      validFrom: hour.validFrom ?? null,
      validTo: hour.validTo ?? null,
    }));
    return this.settings.replaceBusinessHours(organizationId, hours);
  }
}
