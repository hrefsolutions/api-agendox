import { AvailabilityCalculator, type AvailabilityInput } from './availability-calculator';

const TZ = 'America/Argentina/Buenos_Aires'; // fixed UTC-3, no DST
const MONDAY = '2026-08-03';

/** Local wall-clock HH:MM on MONDAY as a UTC millisecond value (BA = UTC-3). */
function localMs(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return Date.UTC(2026, 7, 3, h + 3, m);
}

function baseInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timeZone: TZ,
    fromDate: MONDAY,
    toDate: MONDAY,
    durationMinutes: 60,
    granularityMinutes: 30,
    minNoticeMinutes: 0,
    maxAdvanceDays: 400,
    nowMs: Date.UTC(2026, 0, 1),
    businessHours: [
      {
        dayOfWeek: 1,
        opensAt: '09:00',
        closesAt: '12:00',
        isClosed: false,
        validFrom: null,
        validTo: null,
      },
    ],
    resourceSchedules: [
      { dayOfWeek: 1, startsAt: '09:00', endsAt: '12:00', validFrom: null, validTo: null },
    ],
    busy: [],
    ...overrides,
  };
}

describe('AvailabilityCalculator', () => {
  const calculator = new AvailabilityCalculator();

  it('generates slots on the granularity grid that fit the duration before close', () => {
    const slots = calculator.compute(baseInput());
    expect(slots.map((s) => s.startMs)).toEqual([
      localMs('09:00'),
      localMs('09:30'),
      localMs('10:00'),
      localMs('10:30'),
      localMs('11:00'),
    ]);
  });

  it('excludes slots overlapping a busy interval but keeps adjacent ones', () => {
    const slots = calculator.compute(
      baseInput({ busy: [{ startMs: localMs('10:00'), endMs: localMs('11:00') }] }),
    );
    // 09:00-10:00 (touches busy start) and 11:00-12:00 (touches busy end) survive.
    expect(slots.map((s) => s.startMs)).toEqual([localMs('09:00'), localMs('11:00')]);
  });

  it('intersects business hours with a narrower resource schedule', () => {
    const slots = calculator.compute(
      baseInput({
        businessHours: [
          {
            dayOfWeek: 1,
            opensAt: '09:00',
            closesAt: '18:00',
            isClosed: false,
            validFrom: null,
            validTo: null,
          },
        ],
        resourceSchedules: [
          { dayOfWeek: 1, startsAt: '09:00', endsAt: '11:00', validFrom: null, validTo: null },
        ],
      }),
    );
    expect(slots.map((s) => s.startMs)).toEqual([
      localMs('09:00'),
      localMs('09:30'),
      localMs('10:00'),
    ]);
  });

  it('supports granularity different from duration', () => {
    const slots = calculator.compute(baseInput({ durationMinutes: 45, granularityMinutes: 15 }));
    // 45-min slots every 15 min that end by 12:00: 09:00 … 11:15.
    expect(slots[0].startMs).toBe(localMs('09:00'));
    expect(slots.at(-1)?.startMs).toBe(localMs('11:15'));
  });

  it('drops slots earlier than now + minimum notice', () => {
    const slots = calculator.compute(baseInput({ nowMs: localMs('09:00'), minNoticeMinutes: 90 }));
    // Earliest allowed start is 10:30.
    expect(slots[0].startMs).toBe(localMs('10:30'));
  });

  it('returns nothing on a closed day', () => {
    expect(calculator.compute(baseInput({ businessHours: [] }))).toEqual([]);
  });
});
