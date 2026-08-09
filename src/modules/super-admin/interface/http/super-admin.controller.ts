import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/public.decorator';

import { LoginSuperAdmin, type LoginSuperAdminResult } from '../../application/login-super-admin.use-case';
import { SuperAdminService } from '../../application/super-admin.service';
import type {
  AdminMetrics,
  AdminOrgDetail,
  AdminOrgListItem,
} from '../../application/ports/admin-read.repository';
import { CurrentSuperAdmin } from './current-super-admin.decorator';
import { SuperAdminGuard, type SuperAdminPrincipal } from './super-admin.guard';
import { SuperAdminLoginRequest } from './super-admin.requests';

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

  @Get('organizations/:id')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  organizationDetail(@Param('id') id: string): Promise<AdminOrgDetail> {
    return this.service.getOrganizationDetail(id);
  }

  @Post('organizations/:id/suspend')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  suspend(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetail> {
    return this.service.suspendOrganization(id, admin.superAdminId);
  }

  @Post('organizations/:id/reactivate')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  reactivate(
    @Param('id') id: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<AdminOrgDetail> {
    return this.service.reactivateOrganization(id, admin.superAdminId);
  }
}
