import type { Appointment } from '../entities/appointment.entity';
import type { AppointmentStatus } from '../appointment-status.enum';

export interface ActiveInterval {
  resourceId: string;
  startMs: number;
  endMs: number;
}

export interface CalendarFilters {
  fromMs: number;
  toMs: number;
  resourceId?: string;
  status?: AppointmentStatus;
}

export interface AppointmentRepository {
  save(appointment: Appointment): Promise<void>;
  findById(organizationId: string, id: string): Promise<Appointment | null>;
  /** Existing appointment for a client-supplied idempotency key, if any. */
  findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<Appointment | null>;
  /** Whether an active (blocking) appointment for the resource overlaps `[startMs, endMs)`. */
  hasActiveOverlap(
    organizationId: string,
    resourceId: string,
    startMs: number,
    endMs: number,
  ): Promise<boolean>;
  /** Busy intervals of active appointments for the given resources in a range. */
  findActiveIntervals(
    organizationId: string,
    resourceIds: string[],
    fromMs: number,
    toMs: number,
  ): Promise<ActiveInterval[]>;
  listCalendar(organizationId: string, filters: CalendarFilters): Promise<Appointment[]>;
  /** A client's appointments, most recent first (Customer Portal). */
  listByClient(organizationId: string, clientId: string): Promise<Appointment[]>;
  /**
   * CONFIRMED appointments starting in `(fromMs, toMs]`, across all tenants,
   * for the reminder job. Ordered by start time.
   */
  findConfirmedStartingBetween(fromMs: number, toMs: number, limit: number): Promise<Appointment[]>;
}

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
