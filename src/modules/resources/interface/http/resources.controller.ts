import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import {
  ResourcesService,
  type ResourceDetailView,
  type ResourceView,
} from '../../application/resources.service';
import type { ResourceScheduleEntry } from '../../domain/types';
import {
  AssignServiceRequest,
  CreateResourceRequest,
  SetResourceScheduleRequest,
  UpdateResourceRequest,
} from './resources.requests';

@ApiTags('resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Post()
  @Roles(Role.Owner, Role.Admin)
  create(
    @TenantId() organizationId: string,
    @Body() body: CreateResourceRequest,
  ): Promise<ResourceView> {
    return this.resources.createResource(organizationId, {
      name: body.name,
      type: body.type,
      color: body.color,
      description: body.description,
      userId: body.userId,
    });
  }

  @Get()
  list(@TenantId() organizationId: string): Promise<ResourceView[]> {
    return this.resources.listResources(organizationId);
  }

  @Get(':id')
  get(@TenantId() organizationId: string, @Param('id') id: string): Promise<ResourceDetailView> {
    return this.resources.getResource(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.Owner, Role.Admin)
  update(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateResourceRequest,
  ): Promise<ResourceView> {
    return this.resources.updateResource(organizationId, id, body);
  }

  @Put(':id/schedule')
  @Roles(Role.Owner, Role.Admin)
  setSchedule(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: SetResourceScheduleRequest,
  ): Promise<ResourceScheduleEntry[]> {
    const entries: ResourceScheduleEntry[] = body.entries.map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
      validFrom: entry.validFrom ?? null,
      validTo: entry.validTo ?? null,
    }));
    return this.resources.setSchedule(organizationId, id, entries);
  }

  @Post(':id/services')
  @Roles(Role.Owner, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  assignService(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: AssignServiceRequest,
  ): Promise<void> {
    return this.resources.assignService(organizationId, id, body.serviceId);
  }

  @Delete(':id/services/:serviceId')
  @Roles(Role.Owner, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  unassignService(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    return this.resources.unassignService(organizationId, id, serviceId);
  }
}
