import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

import { TRIAL_DURATION_DAYS, TrialStatus } from '../trial-status.enum';
import { TrialStarted } from '../events/trial-started.event';

interface TrialProps {
  organizationId: string;
  status: TrialStatus;
  startsAt: Date;
  endsAt: Date;
  convertedAt: Date | null;
  createdAt: Date;
}

/** A tenant's initial free period. Cannot be renewed (docs/state-machines.md). */
export class Trial extends AggregateRoot {
  private constructor(
    id: string,
    private props: TrialProps,
  ) {
    super(id);
  }

  /** Starts a 30-day trial and records a {@link TrialStarted} event. */
  static start(organizationId: string, now: Date): Trial {
    const endsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const trial = new Trial(randomUUID(), {
      organizationId,
      status: TrialStatus.Active,
      startsAt: now,
      endsAt,
      convertedAt: null,
      createdAt: now,
    });
    trial.addEvent(new TrialStarted(organizationId, trial.id, endsAt, now));
    return trial;
  }

  static fromPersistence(id: string, props: TrialProps): Trial {
    return new Trial(id, props);
  }

  /** True while the trial is active and not past its end date. */
  isActiveAt(now: Date): boolean {
    return this.props.status === TrialStatus.Active && this.props.endsAt.getTime() > now.getTime();
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get status(): TrialStatus {
    return this.props.status;
  }
  get startsAt(): Date {
    return this.props.startsAt;
  }
  get endsAt(): Date {
    return this.props.endsAt;
  }
  get convertedAt(): Date | null {
    return this.props.convertedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
