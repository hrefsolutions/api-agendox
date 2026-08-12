import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import {
  ServicesService,
  type ServiceDetailView,
  type ServiceOptionView,
  type ServiceView,
} from '../../application/services.service';
import {
  CreateServiceOptionRequest,
  CreateServiceRequest,
  UpdateServiceOptionRequest,
  UpdateServiceRequest,
} from './services.requests';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @Roles(Role.Owner, Role.Admin)
  create(
    @TenantId() organizationId: string,
    @Body() body: CreateServiceRequest,
  ): Promise<ServiceView> {
    return this.services.createService(organizationId, {
      name: body.name,
      description: body.description,
    });
  }

  @Get()
  list(@TenantId() organizationId: string): Promise<ServiceView[]> {
    return this.services.listServices(organizationId);
  }

  @Get(':id')
  get(@TenantId() organizationId: string, @Param('id') id: string): Promise<ServiceDetailView> {
    return this.services.getService(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.Owner, Role.Admin)
  update(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateServiceRequest,
  ): Promise<ServiceView> {
    return this.services.updateService(organizationId, id, body);
  }

  @Post(':serviceId/options')
  @Roles(Role.Owner, Role.Admin)
  createOption(
    @TenantId() organizationId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: CreateServiceOptionRequest,
  ): Promise<ServiceOptionView> {
    return this.services.createOption(organizationId, serviceId, {
      name: body.name,
      durationMinutes: body.durationMinutes,
      price: body.price,
    });
  }

  @Get(':serviceId/options')
  listOptions(
    @TenantId() organizationId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<ServiceOptionView[]> {
    return this.services.listOptions(organizationId, serviceId);
  }

  @Patch(':serviceId/options/:optionId')
  @Roles(Role.Owner, Role.Admin)
  updateOption(
    @TenantId() organizationId: string,
    @Param('optionId') optionId: string,
    @Body() body: UpdateServiceOptionRequest,
  ): Promise<ServiceOptionView> {
    return this.services.updateOption(organizationId, optionId, body);
  }
}
