/**
 * Base class for domain events.
 *
 * A domain event describes something that already happened in the domain (past
 * tense), never a command. Events are framework-agnostic and MUST carry the
 * `organizationId` when they belong to a tenant, so consumers running outside
 * the request scope (async handlers, jobs) never depend on ambient context.
 *
 * See docs/14-eventos-dominio.md.
 */
export abstract class DomainEvent {
  /** Stable, machine-readable event name (e.g. `organization.created`). */
  abstract readonly eventName: string;

  /** Tenant this event belongs to (required for tenant-scoped events). */
  abstract readonly organizationId: string;

  /** When the event occurred (UTC). */
  readonly occurredAt: Date;

  constructor(occurredAt?: Date) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
