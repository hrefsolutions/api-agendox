import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  DOMAIN_EVENT_PUBLISHER,
  UNIT_OF_WORK,
  type Clock,
  type DomainEventPublisher,
  type UnitOfWork,
} from '@shared/application';
import { NotFoundError } from '@shared/errors';

import type { CancellationActor } from '../domain/appointment-source.enum';
import type { Appointment } from '../domain/entities/appointment.entity';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
  type CalendarFilters,
} from '../domain/repositories/appointment.repository';
import { toAppointmentView, type AppointmentView } from './appointment.view';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
  ) {}

  async getCalendar(organizationId: string, filters: CalendarFilters): Promise<AppointmentView[]> {
    const all = await this.appointments.listCalendar(organizationId, filters);
    return all.map(toAppointmentView);
  }

  async get(organizationId: string, id: string): Promise<AppointmentView> {
    const appointment = await this.appointments.findById(organizationId, id);
    if (!appointment) {
      throw new NotFoundError('Turno no encontrado');
    }
    return toAppointmentView(appointment);
  }

  approve(organizationId: string, id: string): Promise<AppointmentView> {
    return this.mutate(organizationId, id, (appointment, now) => appointment.approve(now));
  }

  rejectApproval(
    organizationId: string,
    id: string,
    reason: string | null,
  ): Promise<AppointmentView> {
    return this.mutate(organizationId, id, (appointment, now) =>
      appointment.rejectApproval(reason, now),
    );
  }

  cancel(
    organizationId: string,
    id: string,
    actor: CancellationActor,
    reason: string | null,
  ): Promise<AppointmentView> {
    return this.mutate(organizationId, id, (appointment, now) =>
      appointment.cancel(actor, reason, now),
    );
  }

  complete(organizationId: string, id: string): Promise<AppointmentView> {
    return this.mutate(organizationId, id, (appointment, now) => appointment.complete(now));
  }

  noShow(organizationId: string, id: string): Promise<AppointmentView> {
    return this.mutate(organizationId, id, (appointment, now) => appointment.noShow(now));
  }

  private async mutate(
    organizationId: string,
    id: string,
    apply: (appointment: Appointment, now: Date) => void,
  ): Promise<AppointmentView> {
    const appointment = await this.appointments.findById(organizationId, id);
    if (!appointment) {
      throw new NotFoundError('Turno no encontrado');
    }
    const now = this.clock.now();
    const events = await this.uow.run(async () => {
      apply(appointment, now);
      await this.appointments.save(appointment);
      return appointment.pullEvents();
    });
    await this.publisher.publishAll(events);
    return toAppointmentView(appointment);
  }
}
