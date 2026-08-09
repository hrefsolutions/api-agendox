import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '@common/decorators/public.decorator';

import { AvailabilityQueryRequest } from '@modules/availability/interface/http/availability.requests';
import type { AvailabilityResult } from '@modules/availability/application/availability.dto';

import {
  PublicService,
  type PublicOrganizationView,
  type PublicResourceView,
  type PublicServiceView,
} from '../../application/public.service';
import { RequestCustomerOtp } from '../../application/request-customer-otp.use-case';
import {
  ValidateCustomerOtp,
  type ValidateCustomerOtpResult,
} from '../../application/validate-customer-otp.use-case';
import { OtpRequestRequest, OtpVerifyRequest } from './customer-portal.requests';

/** Public booking surface, resolved by organization slug (no authentication). */
@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly requestOtp: RequestCustomerOtp,
    private readonly validateOtp: ValidateCustomerOtp,
  ) {}

  @Get(':slug')
  getOrganization(@Param('slug') slug: string): Promise<PublicOrganizationView> {
    return this.publicService.getOrganization(slug);
  }

  @Get(':slug/services')
  listServices(@Param('slug') slug: string): Promise<PublicServiceView[]> {
    return this.publicService.listServices(slug);
  }

  @Get(':slug/resources')
  listResources(
    @Param('slug') slug: string,
    @Query('serviceId') serviceId: string,
  ): Promise<PublicResourceView[]> {
    return this.publicService.listResources(slug, serviceId);
  }

  @Get(':slug/availability')
  availability(
    @Param('slug') slug: string,
    @Query() query: AvailabilityQueryRequest,
  ): Promise<AvailabilityResult> {
    return this.publicService.getAvailability(slug, query);
  }

  @Post(':slug/otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async otpRequest(
    @Param('slug') slug: string,
    @Body() body: OtpRequestRequest,
  ): Promise<{ status: 'ok' }> {
    await this.requestOtp.execute(slug, body.email);
    // Always succeeds (anti-enumeration).
    return { status: 'ok' };
  }

  @Post(':slug/otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  otpVerify(
    @Param('slug') slug: string,
    @Body() body: OtpVerifyRequest,
  ): Promise<ValidateCustomerOtpResult> {
    return this.validateOtp.execute(slug, body.email, body.code);
  }
}
