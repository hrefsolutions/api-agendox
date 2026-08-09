import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import { ClientsService, type ClientView } from '../../application/clients.service';
import { CreateClientRequest, UpdateClientRequest } from './clients.requests';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseOffset(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

@ApiTags('clients')
@ApiBearerAuth()
@Roles(Role.Owner, Role.Admin, Role.Receptionist)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  create(
    @TenantId() organizationId: string,
    @Body() body: CreateClientRequest,
  ): Promise<ClientView> {
    return this.clients.create(organizationId, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      whatsapp: body.whatsapp,
      phone: body.phone,
      notes: body.notes,
    });
  }

  @Get()
  list(
    @TenantId() organizationId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: ClientView[]; total: number }> {
    return this.clients.list(organizationId, {
      q,
      limit: clampLimit(limit),
      offset: parseOffset(offset),
    });
  }

  @Get(':id')
  get(@TenantId() organizationId: string, @Param('id') id: string): Promise<ClientView> {
    return this.clients.get(organizationId, id);
  }

  @Patch(':id')
  update(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateClientRequest,
  ): Promise<ClientView> {
    return this.clients.update(organizationId, id, body);
  }
}
