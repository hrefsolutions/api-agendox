import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { TenantId } from '@common/decorators/tenant-id.decorator';

import type { OrganizationView } from '../../../application/dtos/register-organization.dto';
import { GetCurrentOrganization } from '../../../application/use-cases/get-current-organization.use-case';
import { OrganizationResponse } from '../responses/organization.responses';

/**
 * API del negocio sobre su propia organización. Es solo lectura: el alta, la
 * edición y la baja de organizaciones son atribución exclusiva del super admin
 * (ver `POST/PATCH/DELETE /admin/organizations`), así que acá no hay ninguna
 * ruta pública de registro.
 */
@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly getCurrentOrganization: GetCurrentOrganization) {}

  @Get('current')
  @ApiBearerAuth()
  @ApiOkResponse({ type: OrganizationResponse })
  current(@TenantId() organizationId: string): Promise<OrganizationView> {
    return this.getCurrentOrganization.execute(organizationId);
  }
}
