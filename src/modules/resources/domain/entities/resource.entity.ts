import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

interface ResourceProps {
  organizationId: string;
  userId: string | null;
  name: string;
  type: string;
  color: string | null;
  active: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Any bookable element: person, court, room, office, box, equipment (BR-040). */
export class Resource extends AggregateRoot {
  private constructor(
    id: string,
    private props: ResourceProps,
  ) {
    super(id);
  }

  static create(input: {
    organizationId: string;
    name: string;
    type: string;
    color?: string | null;
    description?: string | null;
    userId?: string | null;
    now: Date;
  }): Resource {
    return new Resource(randomUUID(), {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      name: input.name.trim(),
      type: input.type.trim(),
      color: input.color ?? null,
      active: true,
      description: input.description ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: ResourceProps): Resource {
    return new Resource(id, props);
  }

  update(
    patch: Partial<
      Pick<ResourceProps, 'name' | 'type' | 'color' | 'description' | 'active' | 'userId'>
    >,
    now: Date,
  ): void {
    if (patch.name !== undefined) this.props.name = patch.name.trim();
    if (patch.type !== undefined) this.props.type = patch.type.trim();
    if (patch.color !== undefined) this.props.color = patch.color;
    if (patch.description !== undefined) this.props.description = patch.description;
    if (patch.active !== undefined) this.props.active = patch.active;
    if (patch.userId !== undefined) this.props.userId = patch.userId;
    this.props.updatedAt = now;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get userId(): string | null {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): string {
    return this.props.type;
  }
  get color(): string | null {
    return this.props.color;
  }
  get active(): boolean {
    return this.props.active;
  }
  get description(): string | null {
    return this.props.description;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
