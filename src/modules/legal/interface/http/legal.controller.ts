import { Controller, Get, Headers, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';
import { Role } from '@shared/domain';

import { TermsService } from '../../application/terms.service';
import type { TermsStatus } from '../../domain/terms';
import { TermsStatusResponse } from './legal.responses';

/**
 * Aceptación de los Términos y Condiciones del negocio.
 *
 * La lectura la puede hacer cualquier miembro del staff (el panel la consulta en
 * cada carga), pero **aceptar es exclusivo del Owner**: es quien representa al
 * negocio frente a la plataforma. Una recepcionista no puede obligar al negocio
 * a un contrato.
 */
@ApiTags('legal')
@ApiBearerAuth()
@Controller('legal/terms')
export class LegalController {
  constructor(private readonly terms: TermsService) {}

  @Get('acceptance')
  @ApiOkResponse({ type: TermsStatusResponse })
  status(@TenantId() organizationId: string): Promise<TermsStatus> {
    return this.terms.getStatus(organizationId);
  }

  @Post('acceptance')
  @Roles(Role.Owner)
  @HttpCode(200)
  @ApiOkResponse({ type: TermsStatusResponse })
  accept(
    @TenantId() organizationId: string,
    @CurrentUser() user: StaffPrincipal,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<TermsStatus> {
    return this.terms.accept({
      organizationId,
      userId: user.userId,
      ipAddress: ip || null,
      // Se recorta: la columna es texto libre que viene del cliente y no hay
      // motivo para guardar cadenas gigantes.
      userAgent: userAgent?.slice(0, 512) ?? null,
    });
  }
}
