import { DomainEvent } from '../domain/domain-event';

/**
 * Publishes domain events to in-process subscribers.
 *
 * Use-cases collect events from aggregates (`pullEvents()`) and publish them
 * **after** the transaction commits, so side effects (notifications, audit,
 * analytics) never react to changes that were rolled back.
 */
export interface DomainEventPublisher {
  publishAll(events: DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');
