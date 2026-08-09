/**
 * Appointment lifecycle. `PENDING_APPROVAL` is an addition over the original
 * state-machine doc (resolves the "no-deposit + manual approval" gap — see the
 * plan's domain-gaps section; must be reflected in docs/state-machines.md).
 */
export enum AppointmentStatus {
  PendingDeposit = 'PENDING_DEPOSIT',
  PendingApproval = 'PENDING_APPROVAL',
  Confirmed = 'CONFIRMED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  Rejected = 'REJECTED',
  NoShow = 'NO_SHOW',
}

/** Statuses that occupy a resource's time and therefore block availability. */
export const BLOCKING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.PendingDeposit,
  AppointmentStatus.PendingApproval,
  AppointmentStatus.Confirmed,
  AppointmentStatus.Completed,
];
