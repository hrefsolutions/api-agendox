import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import type { Appointment } from '../domain/entities/appointment.entity';

export interface AppointmentView {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceOptionId: string;
  serviceOptionName: string;
  durationMinutes: number;
  servicePrice: number;
  resourceId: string;
  resourceName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  startsAt: Date;
  endsAt: Date;
  depositAmount: number;
  remainingAmount: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  cancellationReason: string | null;
}

export function toAppointmentView(appointment: Appointment): AppointmentView {
  const s = appointment.snapshot;
  return {
    id: appointment.id,
    serviceId: s.serviceId,
    serviceName: s.serviceName,
    serviceOptionId: s.serviceOptionId,
    serviceOptionName: s.serviceOptionName,
    durationMinutes: s.durationMinutes,
    servicePrice: s.servicePrice.toNumber(),
    resourceId: s.resourceId,
    resourceName: s.resourceName,
    clientId: s.clientId,
    clientName: s.clientName,
    clientPhone: s.clientPhone,
    clientEmail: s.clientEmail,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    depositAmount: s.depositAmount.toNumber(),
    remainingAmount: s.remainingAmount.toNumber(),
    status: s.status,
    source: s.source,
    notes: s.notes,
    cancellationReason: s.cancellationReason,
  };
}
