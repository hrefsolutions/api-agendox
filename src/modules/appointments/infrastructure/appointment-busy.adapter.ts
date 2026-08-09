import { Inject, Injectable } from '@nestjs/common';

import type {
  AppointmentBusyProvider,
  ResourceBusyInterval,
} from '@modules/availability/application/appointment-busy.port';

import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '../domain/repositories/appointment.repository';

/**
 * Implements the availability engine's {@link AppointmentBusyProvider} port,
 * feeding it the busy intervals of active appointments so already-booked times
 * are excluded from computed slots.
 */
@Injectable()
export class AppointmentBusyAdapter implements AppointmentBusyProvider {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
  ) {}

  findBusyIntervals(
    organizationId: string,
    resourceIds: string[],
    fromMs: number,
    toMs: number,
  ): Promise<ResourceBusyInterval[]> {
    return this.appointments.findActiveIntervals(organizationId, resourceIds, fromMs, toMs);
  }
}
