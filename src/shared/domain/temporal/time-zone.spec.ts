import { eachDateInclusive, parseIsoDate, weekdayOf, zonedTimeToUtcMs } from './time-zone';

describe('time-zone helpers', () => {
  it('computes weekday (0=Sunday)', () => {
    expect(weekdayOf(parseIsoDate('2026-08-02'))).toBe(0); // Sunday
    expect(weekdayOf(parseIsoDate('2026-08-03'))).toBe(1); // Monday
  });

  it('enumerates an inclusive date range', () => {
    const dates = eachDateInclusive('2026-08-01', '2026-08-03').map((d) => d.iso);
    expect(dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  it('converts a fixed-offset local time to UTC', () => {
    // Buenos Aires is UTC-3 year-round (no DST).
    const utc = zonedTimeToUtcMs(
      parseIsoDate('2026-08-03'),
      9,
      0,
      'America/Argentina/Buenos_Aires',
    );
    expect(new Date(utc).toISOString()).toBe('2026-08-03T12:00:00.000Z');
  });

  it('honors DST for a timezone that observes it', () => {
    // Madrid: CEST (UTC+2) in summer, CET (UTC+1) in winter.
    const summer = zonedTimeToUtcMs(parseIsoDate('2026-07-01'), 12, 0, 'Europe/Madrid');
    expect(new Date(summer).toISOString()).toBe('2026-07-01T10:00:00.000Z');
    const winter = zonedTimeToUtcMs(parseIsoDate('2026-01-15'), 12, 0, 'Europe/Madrid');
    expect(new Date(winter).toISOString()).toBe('2026-01-15T11:00:00.000Z');
  });
});
