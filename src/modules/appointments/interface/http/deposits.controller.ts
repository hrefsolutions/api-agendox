import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';
import { Role } from '@shared/domain';

import { DepositsService, type DepositView } from '../../application/deposits.service';

@ApiTags('deposits')
@ApiBearerAuth()
@Roles(Role.Owner, Role.Admin)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Get('pending')
  listPending(@TenantId() organizationId: string): Promise<DepositView[]> {
    return this.deposits.listPending(organizationId);
  }

  @Post(':id/confirm')
  confirm(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() principal: StaffPrincipal,
  ): Promise<DepositView> {
    return this.deposits.confirm(organizationId, id, principal.userId);
  }

  @Post(':id/reject')
  reject(@TenantId() organizationId: string, @Param('id') id: string): Promise<DepositView> {
    return this.deposits.reject(organizationId, id);
  }
}
