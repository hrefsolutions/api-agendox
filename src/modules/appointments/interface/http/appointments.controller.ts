import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { Role } from '@shared/domain';

import { AppointmentSource } from '../../domain/appointment-source.enum';
import { CreateAppointment } from '../../application/create-appointment.use-case';
import { AppointmentsService } from '../../application/appointments.service';
import type { AppointmentView } from '../../application/appointment.view';
import {
  CalendarQueryRequest,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RejectAppointmentRequest,
} from './appointments.requests';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointment: CreateAppointment,
    private readonly appointments: AppointmentsService,
  ) {}

  @Post()
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  create(
    @TenantId() organizationId: string,
    @Body() body: CreateAppointmentRequest,
  ): Promise<AppointmentView> {
    return this.createAppointment.execute(organizationId, {
      serviceId: body.serviceId,
      serviceOptionId: body.serviceOptionId,
      resourceId: body.resourceId,
      clientId: body.clientId,
      startsAt: new Date(body.startsAt),
      source: AppointmentSource.Internal,
      notes: body.notes,
    });
  }

  @Get()
  calendar(
    @TenantId() organizationId: string,
    @Query() query: CalendarQueryRequest,
  ): Promise<AppointmentView[]> {
    return this.appointments.getCalendar(organizationId, {
      fromMs: new Date(query.from).getTime(),
      toMs: new Date(query.to).getTime(),
      resourceId: query.resourceId,
      status: query.status,
    });
  }

  @Get(':id')
  get(@TenantId() organizationId: string, @Param('id') id: string): Promise<AppointmentView> {
    return this.appointments.get(organizationId, id);
  }

  @Post(':id/approve')
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  approve(@TenantId() organizationId: string, @Param('id') id: string): Promise<AppointmentView> {
    return this.appointments.approve(organizationId, id);
  }

  @Post(':id/reject')
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  reject(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: RejectAppointmentRequest,
  ): Promise<AppointmentView> {
    return this.appointments.rejectApproval(organizationId, id, body.reason ?? null);
  }

  @Post(':id/cancel')
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  cancel(
    @TenantId() organizationId: string,
    @Param('id') id: string,
    @Body() body: CancelAppointmentRequest,
  ): Promise<AppointmentView> {
    return this.appointments.cancel(organizationId, id, 'STAFF', body.reason ?? null);
  }

  @Post(':id/complete')
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  complete(@TenantId() organizationId: string, @Param('id') id: string): Promise<AppointmentView> {
    return this.appointments.complete(organizationId, id);
  }

  @Post(':id/no-show')
  @Roles(Role.Owner, Role.Admin, Role.Receptionist)
  noShow(@TenantId() organizationId: string, @Param('id') id: string): Promise<AppointmentView> {
    return this.appointments.noShow(organizationId, id);
  }
}
