/**
 * Abstraction over the current time, so time-dependent domain logic (trial
 * expiry, availability min-notice, token lifetimes) stays deterministic and
 * unit-testable with a fake clock.
 */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

/** Default system clock (UTC instants). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
