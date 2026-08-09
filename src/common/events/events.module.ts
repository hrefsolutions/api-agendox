import { Global, Module } from '@nestjs/common';

import { DOMAIN_EVENT_PUBLISHER } from '@shared/application';

import { DomainEventEmitterPublisher } from './domain-event-emitter.publisher';

/**
 * Global wiring for domain-event publishing. Assumes `EventEmitterModule.forRoot()`
 * is registered in the composition root so `EventEmitter2` is injectable.
 */
@Global()
@Module({
  providers: [{ provide: DOMAIN_EVENT_PUBLISHER, useClass: DomainEventEmitterPublisher }],
  exports: [DOMAIN_EVENT_PUBLISHER],
})
export class EventsModule {}
