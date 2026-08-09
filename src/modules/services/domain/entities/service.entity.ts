import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

interface ServiceProps {
  organizationId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A service is a template of what the business offers; never a booking (BR-050). */
export class Service extends AggregateRoot {
  private constructor(
    id: string,
    private props: ServiceProps,
  ) {
    super(id);
  }

  static create(input: {
    organizationId: string;
    name: string;
    description?: string | null;
    now: Date;
  }): Service {
    return new Service(randomUUID(), {
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: ServiceProps): Service {
    return new Service(id, props);
  }

  update(patch: Partial<Pick<ServiceProps, 'name' | 'description' | 'active'>>, now: Date): void {
    if (patch.name !== undefined) this.props.name = patch.name.trim();
    if (patch.description !== undefined) this.props.description = patch.description;
    if (patch.active !== undefined) this.props.active = patch.active;
    this.props.updatedAt = now;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get active(): boolean {
    return this.props.active;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
