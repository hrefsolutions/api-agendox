import { randomUUID } from 'node:crypto';

import { AggregateRoot, Money } from '@shared/domain';
import { ValidationError } from '@shared/errors';

interface ServiceOptionProps {
  organizationId: string;
  serviceId: string;
  durationMinutes: number;
  price: Money;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A reservable variant of a service: duration + price (BR-060). */
export class ServiceOption extends AggregateRoot {
  private constructor(
    id: string,
    private props: ServiceOptionProps,
  ) {
    super(id);
  }

  static create(input: {
    organizationId: string;
    serviceId: string;
    durationMinutes: number;
    price: Money;
    now: Date;
  }): ServiceOption {
    ServiceOption.assertDuration(input.durationMinutes);
    return new ServiceOption(randomUUID(), {
      organizationId: input.organizationId,
      serviceId: input.serviceId,
      durationMinutes: input.durationMinutes,
      price: input.price,
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: ServiceOptionProps): ServiceOption {
    return new ServiceOption(id, props);
  }

  update(patch: { durationMinutes?: number; price?: Money; active?: boolean }, now: Date): void {
    if (patch.durationMinutes !== undefined) {
      ServiceOption.assertDuration(patch.durationMinutes);
      this.props.durationMinutes = patch.durationMinutes;
    }
    if (patch.price !== undefined) this.props.price = patch.price;
    if (patch.active !== undefined) this.props.active = patch.active;
    this.props.updatedAt = now;
  }

  private static assertDuration(minutes: number): void {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new ValidationError('durationMinutes debe ser un número entero positivo', { minutes });
    }
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get serviceId(): string {
    return this.props.serviceId;
  }
  get durationMinutes(): number {
    return this.props.durationMinutes;
  }
  get price(): Money {
    return this.props.price;
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
