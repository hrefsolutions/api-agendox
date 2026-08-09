import {
  eachDateInclusive,
  parseWallTime,
  weekdayOf,
  zonedTimeToUtcMs,
  type CalendarDate,
} from '@shared/domain/temporal/time-zone';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Weekly opening window of the business (local wall-clock time). */
export interface OpeningHour {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  validFrom: string | null;
  validTo: string | null;
}

/** Weekly availability window of a resource (local wall-clock time). */
export interface ScheduleWindow {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  validFrom: string | null;
  validTo: string | null;
}

/** A UTC interval that blocks slots (a time block or an existing appointment). */
export interface BusyInterval {
  startMs: number;
  endMs: number;
}

export interface AvailabilityInput {
  timeZone: string;
  fromDate: string;
  toDate: string;
  durationMinutes: number;
  granularityMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  nowMs: number;
  businessHours: OpeningHour[];
  resourceSchedules: ScheduleWindow[];
  busy: BusyInterval[];
}

export interface Slot {
  date: string;
  startMs: number;
  endMs: number;
}

/** Inputs for the {@link AvailabilityCalculator.isBookable} point-check. */
export interface BookabilityInput {
  timeZone: string;
  date: CalendarDate;
  businessHours: OpeningHour[];
  resourceSchedules: ScheduleWindow[];
  busy: BusyInterval[];
  startMs: number;
  endMs: number;
}

interface Interval {
  startMs: number;
  endMs: number;
}

/**
 * Pure, framework-free availability engine. Given business hours, a resource's
 * schedule, its busy intervals and booking rules, it returns the bookable slots
 * for a service option's duration. Availability is always computed, never
 * stored (docs/07-motor-disponibilidad.md, BR-070).
 */
export class AvailabilityCalculator {
  compute(input: AvailabilityInput): Slot[] {
    if (input.durationMinutes <= 0 || input.granularityMinutes <= 0) return [];

    const durationMs = input.durationMinutes * MS_PER_MINUTE;
    const granularityMs = input.granularityMinutes * MS_PER_MINUTE;
    const earliestMs = input.nowMs + input.minNoticeMinutes * MS_PER_MINUTE;
    const latestMs = input.nowMs + input.maxAdvanceDays * MS_PER_DAY;

    const slots: Slot[] = [];
    for (const date of eachDateInclusive(input.fromDate, input.toDate)) {
      const weekday = weekdayOf(date);
      const businessWindows = this.businessWindows(
        input.businessHours,
        input.timeZone,
        date,
        weekday,
      );
      const resourceWindows = this.resourceWindows(
        input.resourceSchedules,
        input.timeZone,
        date,
        weekday,
      );
      const open = intersect(businessWindows, resourceWindows);

      for (const window of open) {
        for (
          let start = window.startMs;
          start + durationMs <= window.endMs;
          start += granularityMs
        ) {
          if (start > latestMs) break;
          const end = start + durationMs;
          if (start < earliestMs) continue;
          if (overlapsAny(input.busy, start, end)) continue;
          slots.push({ date: date.iso, startMs: start, endMs: end });
        }
      }
    }

    slots.sort((a, b) => a.startMs - b.startMs);
    return slots;
  }

  /**
   * Point-check used when creating an appointment: is the interval `[startMs,
   * endMs)` fully inside an open (business ∩ resource) window on `date` and free
   * of the given busy intervals? Concurrency (overlapping appointments) is
   * handled separately at the transaction level.
   */
  isBookable(input: BookabilityInput): boolean {
    const weekday = weekdayOf(input.date);
    const open = intersect(
      this.businessWindows(input.businessHours, input.timeZone, input.date, weekday),
      this.resourceWindows(input.resourceSchedules, input.timeZone, input.date, weekday),
    );
    const contained = open.some(
      (window) => window.startMs <= input.startMs && input.endMs <= window.endMs,
    );
    if (!contained) return false;
    return !overlapsAny(input.busy, input.startMs, input.endMs);
  }

  private businessWindows(
    businessHours: OpeningHour[],
    timeZone: string,
    date: CalendarDate,
    weekday: number,
  ): Interval[] {
    const windows: Interval[] = [];
    for (const hour of businessHours) {
      if (hour.dayOfWeek !== weekday || hour.isClosed) continue;
      if (!hour.opensAt || !hour.closesAt) continue;
      if (!isApplicable(hour.validFrom, hour.validTo, date.iso)) continue;
      const interval = this.toInterval(date, hour.opensAt, hour.closesAt, timeZone);
      if (interval) windows.push(interval);
    }
    return windows;
  }

  private resourceWindows(
    resourceSchedules: ScheduleWindow[],
    timeZone: string,
    date: CalendarDate,
    weekday: number,
  ): Interval[] {
    const windows: Interval[] = [];
    for (const schedule of resourceSchedules) {
      if (schedule.dayOfWeek !== weekday) continue;
      if (!isApplicable(schedule.validFrom, schedule.validTo, date.iso)) continue;
      const interval = this.toInterval(date, schedule.startsAt, schedule.endsAt, timeZone);
      if (interval) windows.push(interval);
    }
    return windows;
  }

  private toInterval(
    date: CalendarDate,
    opensAt: string,
    closesAt: string,
    timeZone: string,
  ): Interval | null {
    const opens = parseWallTime(opensAt);
    const closes = parseWallTime(closesAt);
    const startMs = zonedTimeToUtcMs(date, opens.hours, opens.minutes, timeZone);
    const endMs = zonedTimeToUtcMs(date, closes.hours, closes.minutes, timeZone);
    return endMs > startMs ? { startMs, endMs } : null;
  }
}

/** Intersection of two lists of intervals (semi-open, adjacency does not overlap). */
function intersect(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const startMs = Math.max(x.startMs, y.startMs);
      const endMs = Math.min(x.endMs, y.endMs);
      if (startMs < endMs) result.push({ startMs, endMs });
    }
  }
  return result;
}

function overlapsAny(busy: BusyInterval[], startMs: number, endMs: number): boolean {
  return busy.some((interval) => startMs < interval.endMs && interval.startMs < endMs);
}

function isApplicable(validFrom: string | null, validTo: string | null, iso: string): boolean {
  if (validFrom && iso < validFrom) return false;
  if (validTo && iso > validTo) return false;
  return true;
}
