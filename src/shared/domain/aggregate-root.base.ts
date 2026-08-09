import { DomainEvent } from './domain-event';
import { Entity } from './entity.base';

/**
 * Base class for aggregate roots.
 *
 * An aggregate root is the consistency boundary of a cluster of entities and
 * the only object that records {@link DomainEvent}s. Use-cases persist the
 * aggregate and then drain its events with {@link pullEvents} to publish them
 * **after** the transaction commits.
 */
export abstract class AggregateRoot<TId extends string = string> extends Entity<TId> {
  private _events: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  /** Returns the recorded events and clears the internal buffer. */
  pullEvents(): DomainEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
