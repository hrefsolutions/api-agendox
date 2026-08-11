import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/public.decorator';

import type {
  RegisterOrganizationResult,
} from '@modules/organizations/application/dtos/register-organization.dto';
import type { OrganizationFeatures } from '@modules/organizations/domain/organization-features';

import { LoginSuperAdmin, type LoginSuperAdminResult } from '../../application/login-super-admin.use-case';
import {
  SuperAdminService,
  type AdminOrgDetailWithFeatures,
} from '../../application/super-admin.service';
import type { AdminMetrics, AdminOrgListItem } from '../../application/ports/admin-read.repository';
import { CurrentSuperAdmin } from './current-super-admin.decorator';
import { SuperAdminGuard, type SuperAdminPrincipal } from './super-admin.guard';
import {
  CreateOrganizationRequest,
  SuperAdminLoginRequest,
  UpdateOrganizationFeaturesRequest,
  UpdateOrganizationRequest,
} from './super-admin.requests';

/**
 * Platform (super-admin) API. `@Public()` bypasses the global staff auth guard;
 * protected routes are gated by {@link SuperAdminGuard} (a separate token/secret).
 */
@ApiTags('super-admin')
@Public()
@Controller('admin')
export class SuperAdminController {
  constructor(
    private readonly login: LoginSuperAdmin,
    private readonly service: SuperAdminService,
  ) {}

  @Post('auth/login')
  authLogin(@Body() body: SuperAdminLoginRequest): Promise<LoginSuperAdminResult> {
    return this.login.execute(body.email, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  me(@CurrentSuperAdmin() admin: SuperAdminPrincipal): SuperAdminPrincipal {
    return admin;
  }

  @Get('metrics')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  metrics(): Promise<AdminMetrics> {
    return this.service.getMetrics();
  }

  @Get('organizations')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  listOrganizations(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ): Promise<AdminOrgListItem[]> {
    return this.service.listOrganizations({ status, q });
  }

  /** Alta de un negocio con su usuario dueño. Es la única vía de registro. */
  @Post('organizations')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  createOrganization(
    @Body() body: CreateOrganizationRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<RegisterOrganizationResult> {
    return this.service.createOrganization(body, admin.superAdminId);
  }

  @Get('organizations/:id')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  organizationDetail(@Param('id') id: string): Promise<AdminOrgDetailWithFeatures> {
    return this.service.getOrganizationDetail(id);
  }

  @Patch('organizations/:id')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetailWithFeatures> {
    return this.service.updateOrganization(id, body, admin.superAdminId);
  }

  /**
   * Baja del negocio. Deja la organización en `DISABLED` y conserva los datos:
   * no es un borrado físico (ver `Organization.disable`).
   */
  @Delete('organizations/:id')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  disableOrganization(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetailWithFeatures> {
    return this.service.disableOrganization(id, admin.superAdminId);
  }

  @Patch('organizations/:id/features')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  updateFeatures(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationFeaturesRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<OrganizationFeatures> {
    return this.service.updateFeatures(id, body, admin.superAdminId);
  }

  @Post('organizations/:id/suspend')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  suspend(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetailWithFeatures> {
    return this.service.suspendOrganization(id, admin.superAdminId);
  }

  @Post('organizations/:id/reactivate')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  reactivate(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetailWithFeatures> {
    return this.service.reactivateOrganization(id, admin.superAdminId);
  }
}
