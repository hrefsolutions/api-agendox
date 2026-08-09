import { Injectable } from '@nestjs/common';

/** A busy interval owned by a specific resource (an active appointment). */
export interface ResourceBusyInterval {
  resourceId: string;
  startMs: number;
  endMs: number;
}

/**
 * Supplies the busy intervals produced by existing active appointments, so the
 * availability engine can exclude already-booked times. Implemented by the
 * appointments module (M5); until then the default returns nothing.
 */
export interface AppointmentBusyProvider {
  findBusyIntervals(
    organizationId: string,
    resourceIds: string[],
    fromMs: number,
    toMs: number,
  ): Promise<ResourceBusyInterval[]>;
}

export const APPOINTMENT_BUSY_PROVIDER = Symbol('APPOINTMENT_BUSY_PROVIDER');

/** Default provider used before the appointments module is wired in. */
@Injectable()
export class EmptyAppointmentBusyProvider implements AppointmentBusyProvider {
  findBusyIntervals(): Promise<ResourceBusyInterval[]> {
    return Promise.resolve([]);
  }
}
