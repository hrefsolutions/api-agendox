import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '@common/decorators/public.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';

import type {
  OrganizationView,
  RegisterOrganizationResult,
} from '../../../application/dtos/register-organization.dto';
import { GetCurrentOrganization } from '../../../application/use-cases/get-current-organization.use-case';
import { RegisterOrganization } from '../../../application/use-cases/register-organization.use-case';
import { RegisterOrganizationRequest } from '../requests/register-organization.request';
import {
  OrganizationResponse,
  RegisterOrganizationResponse,
} from '../responses/organization.responses';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly registerOrganization: RegisterOrganization,
    private readonly getCurrentOrganization: GetCurrentOrganization,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiCreatedResponse({ type: RegisterOrganizationResponse })
  register(@Body() body: RegisterOrganizationRequest): Promise<RegisterOrganizationResult> {
    return this.registerOrganization.execute(body);
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiOkResponse({ type: OrganizationResponse })
  current(@TenantId() organizationId: string): Promise<OrganizationView> {
    return this.getCurrentOrganization.execute(organizationId);
  }
}
