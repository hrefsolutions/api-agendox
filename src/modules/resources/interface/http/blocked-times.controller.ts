import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';
import { Role } from '@shared/domain';

import { ResourcesService, type BlockedTimeView } from '../../application/resources.service';
import { CreateBlockedTimeRequest } from './resources.requests';

@ApiTags('blocked-times')
@ApiBearerAuth()
@Roles(Role.Owner, Role.Admin)
@Controller('blocked-times')
export class BlockedTimesController {
  constructor(private readonly resources: ResourcesService) {}

  @Post()
  create(
    @TenantId() organizationId: string,
    @CurrentUser() principal: StaffPrincipal,
    @Body() body: CreateBlockedTimeRequest,
  ): Promise<BlockedTimeView> {
    return this.resources.createBlockedTime(organizationId, {
      resourceId: body.resourceId,
      // Wall-clock local strings; the service converts using the org timezone.
      startsAtLocal: body.startsAt,
      endsAtLocal: body.endsAt,
      reason: body.reason,
      type: body.type,
      createdByUserId: principal.userId,
    });
  }

  @Get()
  list(@TenantId() organizationId: string): Promise<BlockedTimeView[]> {
    return this.resources.listBlockedTimes(organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@TenantId() organizationId: string, @Param('id') id: string): Promise<void> {
    return this.resources.deleteBlockedTime(organizationId, id);
  }
}
