import { DomainEvent } from '@shared/domain';

/** Emitted when a new organization's 30-day trial begins (BR-120). */
export class TrialStarted extends DomainEvent {
  readonly eventName = 'trial.started';

  constructor(
    readonly organizationId: string,
    readonly trialId: string,
    readonly endsAt: Date,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
