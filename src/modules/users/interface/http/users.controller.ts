import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import {
  UsersService,
  type CreatedUserView,
  type UserView,
} from '../../application/users.service';
import { CreateUserRequest, UpdateUserRequest } from './users.requests';

/**
 * Staff / team management (MS1).
 *
 * TODO(MS5): staff management is provisionally gated to Owner+Admin so it is
 * usable today (and so the resource form's user selector works for the same
 * audience that manages resources). The definitive authorization — a
 * platform-global SUPER_ADMIN — arrives with MS5; revisit these guards then.
 */
@ApiTags('users')
@ApiBearerAuth()
@Roles(Role.Owner, Role.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(
    @TenantId() organizationId: string,
    @Body() body: CreateUserRequest,
  ): Promise<CreatedUserView> {
    return this.users.create(organizationId, body);
  }

  @Get()
  list(@TenantId() organizationId: string): Promise<UserView[]> {
    return this.users.list(organizationId);
  }

  @Get(':id')
  get(@TenantId() organizationId: string, @Param('id') id: string): Promise<UserView> {
    return this.users.get(organizationId, id);
  }

  @Patch(':id')
  update(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: UpdateUserRequest,
  ): Promise<UserView> {
    return this.users.update(organizationId, id, body);
  }

  @Post(':id/reset-password')
  resetPassword(
    @TenantId() organizationId: string,
    @Param('id') id: string,
  ): Promise<{ temporaryPassword: string }> {
    return this.users.resetPassword(organizationId, id);
  }
}
