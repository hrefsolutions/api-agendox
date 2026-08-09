import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, inArray, lte, lt } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { AppointmentStatus, BLOCKING_APPOINTMENT_STATUSES } from '../../domain/appointment-status.enum';
import type { Appointment } from '../../domain/entities/appointment.entity';
import type {
  ActiveInterval,
  AppointmentRepository,
  CalendarFilters,
} from '../../domain/repositories/appointment.repository';
import { AppointmentMapper } from '../mappers/appointment.mapper';
import { appointments } from './appointment.schema';

const BLOCKING = [...BLOCKING_APPOINTMENT_STATUSES];

@Injectable()
export class DrizzleAppointmentRepository
  extends BaseDrizzleRepository
  implements AppointmentRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(appointment: Appointment): Promise<void> {
    const row = AppointmentMapper.toRow(appointment);
    await this.executor
      .insert(appointments)
      .values(row)
      .onConflictDoUpdate({
        target: appointments.id,
        set: {
          status: row.status,
          notes: row.notes,
          cancellationReason: row.cancellationReason,
          updatedAt: row.updatedAt,
        },
      });
  }

  async findById(organizationId: string, id: string): Promise<Appointment | null> {
    const rows = await this.executor
      .select()
      .from(appointments)
      .where(and(eq(appointments.organizationId, organizationId), eq(appointments.id, id)))
      .limit(1);
    return rows[0] ? AppointmentMapper.toDomain(rows[0]) : null;
  }

  async findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<Appointment | null> {
    const rows = await this.executor
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? AppointmentMapper.toDomain(rows[0]) : null;
  }

  async hasActiveOverlap(
    organizationId: string,
    resourceId: string,
    startMs: number,
    endMs: number,
  ): Promise<boolean> {
    const rows = await this.executor
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.resourceId, resourceId),
          inArray(appointments.status, BLOCKING),
          lt(appointments.startsAt, new Date(endMs)),
          gt(appointments.endsAt, new Date(startMs)),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async findActiveIntervals(
    organizationId: string,
    resourceIds: string[],
    fromMs: number,
    toMs: number,
  ): Promise<ActiveInterval[]> {
    if (resourceIds.length === 0) return [];
    const rows = await this.executor
      .select({
        resourceId: appointments.resourceId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          inArray(appointments.resourceId, resourceIds),
          inArray(appointments.status, BLOCKING),
          lt(appointments.startsAt, new Date(toMs)),
          gt(appointments.endsAt, new Date(fromMs)),
        ),
      );
    return rows.map((row) => ({
      resourceId: row.resourceId,
      startMs: row.startsAt.getTime(),
      endMs: row.endsAt.getTime(),
    }));
  }

  async listCalendar(organizationId: string, filters: CalendarFilters): Promise<Appointment[]> {
    const conditions = [
      eq(appointments.organizationId, organizationId),
      gt(appointments.startsAt, new Date(filters.fromMs - 1)),
      lt(appointments.startsAt, new Date(filters.toMs)),
    ];
    if (filters.resourceId) conditions.push(eq(appointments.resourceId, filters.resourceId));
    if (filters.status) conditions.push(eq(appointments.status, filters.status));

    const rows = await this.executor
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(asc(appointments.startsAt));
    return rows.map((row) => AppointmentMapper.toDomain(row));
  }

  async listByClient(organizationId: string, clientId: string): Promise<Appointment[]> {
    const rows = await this.executor
      .select()
      .from(appointments)
      .where(
        and(eq(appointments.organizationId, organizationId), eq(appointments.clientId, clientId)),
      )
      .orderBy(desc(appointments.startsAt));
    return rows.map((row) => AppointmentMapper.toDomain(row));
  }

  async findConfirmedStartingBetween(
    fromMs: number,
    toMs: number,
    limit: number,
  ): Promise<Appointment[]> {
    const rows = await this.executor
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, AppointmentStatus.Confirmed),
          gt(appointments.startsAt, new Date(fromMs)),
          lte(appointments.startsAt, new Date(toMs)),
        ),
      )
      .orderBy(asc(appointments.startsAt))
      .limit(limit);
    return rows.map((row) => AppointmentMapper.toDomain(row));
  }
}
