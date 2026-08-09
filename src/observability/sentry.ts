import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initializes Sentry error reporting when `SENTRY_DSN` is set. No-op otherwise
 * (dev/tests), so `Sentry.captureException` elsewhere is always safe to call.
 * Must run as early as possible, before the Nest app is created.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });
  initialized = true;
}

/** Whether Sentry was initialized (a DSN was provided). */
export function isSentryEnabled(): boolean {
  return initialized;
}
