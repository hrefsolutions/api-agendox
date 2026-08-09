/** Where an appointment originated. */
export enum AppointmentSource {
  Public = 'PUBLIC',
  Internal = 'INTERNAL',
}

/** Who initiated a cancellation (for audit / notifications). */
export type CancellationActor = 'OWNER' | 'STAFF' | 'CLIENT' | 'SYSTEM';
