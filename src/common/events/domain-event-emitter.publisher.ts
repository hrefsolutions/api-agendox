import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from 'nestjs-pino';

import type { DomainEvent } from '@shared/domain';
import type { DomainEventPublisher } from '@shared/application';

/**
 * In-process {@link DomainEventPublisher} backed by EventEmitter2.
 *
 * Emits each event by its `eventName` to `@OnEvent(...)` handlers. Publishing
 * happens after the transaction commits; a failing handler is logged and never
 * propagated, so one subscriber cannot break the request or sibling handlers.
 * The contract leaves room to swap in a transactional outbox later.
 */
@Injectable()
export class DomainEventEmitterPublisher implements DomainEventPublisher {
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.emitter.emitAsync(event.eventName, event);
      } catch (err) {
        this.logger.error(
          { err, event: event.eventName, organizationId: event.organizationId },
          'Domain event handler failed',
        );
      }
    }
  }
}
