/**
 * Dependency-free timezone helpers built on the Intl API.
 *
 * Business hours and schedules are configured as local wall-clock time in the
 * organization's IANA timezone; concrete instants are stored in UTC. These
 * helpers convert between the two at the edges, handling DST transitions.
 */

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  iso: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses `"HH:MM"` or `"HH:MM:SS"` into hours/minutes (seconds ignored). */
export function parseWallTime(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(':');
  return { hours: Number(h), minutes: Number(m) };
}

/** Parses `"YYYY-MM-DD"`. */
export function parseIsoDate(iso: string): CalendarDate {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day, iso };
}

function formatIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Day of week for a calendar date: 0=Sunday … 6=Saturday. */
export function weekdayOf(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** Inclusive list of calendar dates between two ISO dates (max-capped by caller). */
export function eachDateInclusive(fromIso: string, toIso: string): CalendarDate[] {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  const dates: CalendarDate[] = [];
  let cursor = Date.UTC(from.year, from.month - 1, from.day);
  const end = Date.UTC(to.year, to.month - 1, to.day);
  while (cursor <= end) {
    const d = new Date(cursor);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    dates.push({ year, month, day, iso: formatIso(year, month, day) });
    cursor += MS_PER_DAY;
  }
  return dates;
}

/**
 * Formats an instant as a human-readable date-time in the given IANA timezone
 * and locale (e.g. `"lun 11 ago, 14:30"`). Used for user-facing copy such as
 * emails; dependency-free via the Intl API.
 */
export function formatZonedDateTime(
  date: Date,
  timeZone: string,
  locale = 'es-AR',
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** The local calendar date (in `timeZone`) at a given UTC millisecond value. */
export function utcMsToZonedDate(utcMs: number, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(utcMs));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    iso: `${map.year}-${map.month}-${map.day}`,
  };
}

/** Offset (ms) that local wall-clock time in `timeZone` is ahead of UTC at `utcMs`. */
function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return asUtc - utcMs;
}

/**
 * Converts a local wall-clock time (in `timeZone`) to a UTC epoch millisecond
 * value. Robust across DST: a first offset guess is corrected once if the
 * instant crosses a transition.
 */
export function zonedTimeToUtcMs(
  date: CalendarDate,
  hours: number,
  minutes: number,
  timeZone: string,
): number {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hours, minutes);
  const firstOffset = offsetMs(guess, timeZone);
  let utc = guess - firstOffset;
  const secondOffset = offsetMs(utc, timeZone);
  if (secondOffset !== firstOffset) {
    utc = guess - secondOffset;
  }
  return utc;
}
