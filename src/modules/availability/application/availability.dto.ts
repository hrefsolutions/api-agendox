export interface AvailabilityQuery {
  serviceId: string;
  serviceOptionId: string;
  /** Optional: omit for "any available resource". */
  resourceId?: string;
  fromDate: string;
  toDate: string;
}

export interface AvailabilitySlotView {
  date: string;
  start: string;
  end: string;
  resourceId: string;
}

export interface AvailabilityResult {
  timeZone: string;
  durationMinutes: number;
  slots: AvailabilitySlotView[];
}
