import type { BlockedTimeType } from './blocked-time-type.enum';

/** A weekly availability window for a resource (local wall-clock time). */
export interface ResourceScheduleEntry {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  validFrom: string | null;
  validTo: string | null;
}

/** A concrete unavailability interval (UTC instants). */
export interface BlockedTime {
  id: string;
  resourceId: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  type: BlockedTimeType;
  createdByUserId: string | null;
  createdAt: Date;
}
