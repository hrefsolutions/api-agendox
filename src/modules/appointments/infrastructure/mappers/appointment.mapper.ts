import { Money } from '@shared/domain';

import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentSource } from '../../domain/appointment-source.enum';
import { AppointmentStatus } from '../../domain/appointment-status.enum';
import type { AppointmentRow, NewAppointmentRow } from '../persistence/appointment.schema';

export class AppointmentMapper {
  static toDomain(row: AppointmentRow): Appointment {
    return Appointment.fromPersistence(row.id, {
      organizationId: row.organizationId,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      serviceOptionId: row.serviceOptionId,
      serviceOptionName: row.serviceOptionName,
      durationMinutes: row.durationMinutes,
      servicePrice: Money.fromDecimalString(row.servicePrice),
      resourceId: row.resourceId,
      resourceName: row.resourceName,
      clientId: row.clientId,
      clientName: row.clientName,
      clientPhone: row.clientPhone,
      clientEmail: row.clientEmail,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      depositAmount: Money.fromDecimalString(row.depositAmount),
      remainingAmount: Money.fromDecimalString(row.remainingAmount),
      status: row.status as AppointmentStatus,
      source: row.source as AppointmentSource,
      notes: row.notes,
      cancellationReason: row.cancellationReason,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(appointment: Appointment): NewAppointmentRow {
    const s = appointment.snapshot;
    return {
      id: appointment.id,
      organizationId: s.organizationId,
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      serviceOptionId: s.serviceOptionId,
      serviceOptionName: s.serviceOptionName,
      durationMinutes: s.durationMinutes,
      servicePrice: s.servicePrice.toDecimalString(),
      resourceId: s.resourceId,
      resourceName: s.resourceName,
      clientId: s.clientId,
      clientName: s.clientName,
      clientPhone: s.clientPhone,
      clientEmail: s.clientEmail,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      depositAmount: s.depositAmount.toDecimalString(),
      remainingAmount: s.remainingAmount.toDecimalString(),
      status: s.status,
      source: s.source,
      notes: s.notes,
      cancellationReason: s.cancellationReason,
      idempotencyKey: s.idempotencyKey,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
