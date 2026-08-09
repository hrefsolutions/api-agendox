import { TrialStarted } from '../events/trial-started.event';
import { TRIAL_DURATION_DAYS, TrialStatus } from '../trial-status.enum';
import { Trial } from './trial.entity';

describe('Trial', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const organizationId = '11111111-1111-1111-1111-111111111111';

  it('starts a 30-day active trial and records a TrialStarted event', () => {
    const trial = Trial.start(organizationId, now);

    expect(trial.status).toBe(TrialStatus.Active);
    expect(trial.startsAt).toEqual(now);
    expect(trial.endsAt.getTime()).toBe(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const events = trial.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TrialStarted);
    expect((events[0] as TrialStarted).organizationId).toBe(organizationId);
    // Events are drained once.
    expect(trial.pullEvents()).toHaveLength(0);
  });

  it('is active before the end date and inactive after it', () => {
    const trial = Trial.start(organizationId, now);
    const beforeEnd = new Date(trial.endsAt.getTime() - 1000);
    const afterEnd = new Date(trial.endsAt.getTime() + 1000);

    expect(trial.isActiveAt(beforeEnd)).toBe(true);
    expect(trial.isActiveAt(afterEnd)).toBe(false);
  });
});
