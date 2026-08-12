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

import type { OrganizationFeatures } from '@modules/organizations/domain/organization-features';
import { PlansService, type PlanView } from '@modules/plans/application/plans.service';

import { LoginSuperAdmin, type LoginSuperAdminResult } from '../../application/login-super-admin.use-case';
import {
  SuperAdminService,
  type AdminOrgDetailWithFeatures,
  type CreateOrganizationResult,
} from '../../application/super-admin.service';
import type { AdminMetrics, AdminOrgListItem } from '../../application/ports/admin-read.repository';
import type { CreatedUserView, UserView } from '@modules/users/application/users.service';
import { CurrentSuperAdmin } from './current-super-admin.decorator';
import { SuperAdminGuard, type SuperAdminPrincipal } from './super-admin.guard';
import {
  CreateOrganizationRequest,
  CreateOrganizationUserRequest,
  SuperAdminLoginRequest,
  UpdateOrganizationFeaturesRequest,
  UpdateOrganizationRequest,
  UpdateOrganizationUserRequest,
  UpdateOwnerEmailRequest,
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
    private readonly plans: PlansService,
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

  /**
   * Planes activos. Duplica `GET /plans` a propósito: ese vive detrás del guard
   * de staff y el super admin tiene otro token, así que no puede consumirlo.
   */
  @Get('plans')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  listPlans(): Promise<PlanView[]> {
    return this.plans.listActive();
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

  /**
   * Alta de un negocio con su usuario dueño. Es la única vía de registro.
   * Con `billing=ACTIVE` + `planId`, además le otorga la suscripción sin cobrar.
   */
  @Post('organizations')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  createOrganization(
    @Body() body: CreateOrganizationRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<CreateOrganizationResult> {
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

  /**
   * Corrige el email del dueño. Importa más de lo que parece: ese email es el
   * `payer_email` que recibe la pasarela, así que un negocio creado con un email
   * de prueba no puede suscribirse hasta cambiarlo.
   */
  @Patch('organizations/:id/owner-email')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  updateOwnerEmail(
    @Param('id') id: string,
    @Body() body: UpdateOwnerEmailRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<{ ownerEmail: string }> {
    return this.service.updateOwnerEmail(id, body.email, admin.superAdminId);
  }

  /**
   * Staff del negocio. Vive acá y no en `/users` porque el super admin tiene su
   * propio token y guard: no puede atravesar el guard de staff, que además saca
   * el tenant del principal.
   */
  @Get('organizations/:id/users')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  listUsers(@Param('id') id: string): Promise<UserView[]> {
    return this.service.listUsers(id);
  }

  /** Alta de recepcionista. Devuelve la contraseña temporal una sola vez. */
  @Post('organizations/:id/users')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  createUser(
    @Param('id') id: string,
    @Body() body: CreateOrganizationUserRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<CreatedUserView> {
    return this.service.createReceptionist(id, body, admin.superAdminId);
  }

  @Patch('organizations/:id/users/:userId')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  updateUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateOrganizationUserRequest,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<UserView> {
    return this.service.updateUser(id, userId, body, admin.superAdminId);
  }

  @Post('organizations/:id/users/:userId/reset-password')
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  resetUserPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentSuperAdmin() admin: SuperAdminPrincipal,
  ): Promise<{ temporaryPassword: string }> {
    return this.service.resetUserPassword(id, userId, admin.superAdminId);
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
