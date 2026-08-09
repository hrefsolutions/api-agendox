import { DomainEvent } from '@shared/domain';

/** Emitted when a new organization (tenant) is registered. */
export class OrganizationCreated extends DomainEvent {
  readonly eventName = 'organization.created';

  constructor(
    readonly organizationId: string,
    readonly slug: string,
    readonly name: string,
    occurredAt?: Date,
  ) {
    super(occurredAt);
  }
}
