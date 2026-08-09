import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

import { ClientStatus } from '../client-status.enum';

interface ClientProps {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  phone: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * End customer of a tenant, and the profile behind the Customer Portal. Email
 * identifies the client within its organization; WhatsApp is mandatory (BR-033).
 * Never shared across organizations (BR-030).
 */
export class Client extends AggregateRoot {
  private constructor(
    id: string,
    private props: ClientProps,
  ) {
    super(id);
  }

  static create(input: {
    organizationId: string;
    firstName: string;
    lastName: string;
    email: string;
    whatsapp: string;
    phone?: string | null;
    notes?: string | null;
    now: Date;
  }): Client {
    return new Client(randomUUID(), {
      organizationId: input.organizationId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      whatsapp: input.whatsapp.trim(),
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      status: ClientStatus.Active,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: ClientProps): Client {
    return new Client(id, props);
  }

  update(
    patch: Partial<
      Pick<ClientProps, 'firstName' | 'lastName' | 'whatsapp' | 'phone' | 'notes' | 'status'>
    >,
    now: Date,
  ): void {
    if (patch.firstName !== undefined) this.props.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) this.props.lastName = patch.lastName.trim();
    if (patch.whatsapp !== undefined) this.props.whatsapp = patch.whatsapp.trim();
    if (patch.phone !== undefined) this.props.phone = patch.phone;
    if (patch.notes !== undefined) this.props.notes = patch.notes;
    if (patch.status !== undefined) this.props.status = patch.status;
    this.props.updatedAt = now;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get firstName(): string {
    return this.props.firstName;
  }
  get lastName(): string {
    return this.props.lastName;
  }
  get email(): string {
    return this.props.email;
  }
  get whatsapp(): string {
    return this.props.whatsapp;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get status(): ClientStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
