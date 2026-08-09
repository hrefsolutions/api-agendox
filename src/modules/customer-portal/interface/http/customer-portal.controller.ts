import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentCustomer } from '@common/decorators/current-customer.decorator';
import { Public } from '@common/decorators/public.decorator';
import type { CustomerPrincipal } from '@common/tenant/request-context';

import type { AppointmentView } from '@modules/appointments/application/appointment.view';

import {
  CustomerPortalService,
  type CustomerAppointmentView,
  type CustomerProfileView,
} from '../../application/customer-portal.service';
import { BookRequest, UpdateProfileRequest } from './customer-portal.requests';
import { CustomerOtpGuard } from './customer-otp.guard';

/**
 * Customer Portal, authenticated by the OTP-issued customer token.
 * `@Public()` bypasses the staff `AuthGuard`; `CustomerOtpGuard` enforces the
 * customer session.
 */
@ApiTags('customer-portal')
@ApiBearerAuth()
@Public()
@UseGuards(CustomerOtpGuard)
@Controller('portal')
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Get('me')
  getProfile(@CurrentCustomer() customer: CustomerPrincipal): Promise<CustomerProfileView | null> {
    return this.portal.getProfile(customer);
  }

  @Put('profile')
  updateProfile(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() body: UpdateProfileRequest,
  ): Promise<CustomerProfileView> {
    return this.portal.updateProfile(customer, {
      firstName: body.firstName,
      lastName: body.lastName,
      whatsapp: body.whatsapp,
      phone: body.phone,
    });
  }

  @Post('appointments')
  book(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() body: BookRequest,
  ): Promise<CustomerAppointmentView> {
    return this.portal.book(customer, {
      serviceId: body.serviceId,
      serviceOptionId: body.serviceOptionId,
      resourceId: body.resourceId,
      startsAt: new Date(body.startsAt),
      idempotencyKey: body.idempotencyKey ?? null,
    });
  }

  @Get('appointments')
  listAppointments(@CurrentCustomer() customer: CustomerPrincipal): Promise<AppointmentView[]> {
    return this.portal.listAppointments(customer);
  }

  @Get('appointments/:id')
  getAppointment(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Param('id') id: string,
  ): Promise<CustomerAppointmentView> {
    return this.portal.getAppointment(customer, id);
  }
}
