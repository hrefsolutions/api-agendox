import { randomUUID } from 'node:crypto';

import { Entity, Money } from '@shared/domain';

import { BillingPeriod, PlanStatus } from '../plan-status.enum';

interface PlanProps {
  name: string;
  price: Money;
  currency: string;
  billingPeriod: BillingPeriod;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** A commercial SaaS plan (global, not tenant-scoped). */
export class Plan extends Entity {
  private constructor(
    id: string,
    private props: PlanProps,
  ) {
    super(id);
  }

  static create(input: {
    name: string;
    price: Money;
    currency: string;
    billingPeriod: BillingPeriod;
    features?: Record<string, unknown>;
    limits?: Record<string, unknown>;
    now: Date;
  }): Plan {
    return new Plan(randomUUID(), {
      name: input.name.trim(),
      price: input.price,
      currency: input.currency,
      billingPeriod: input.billingPeriod,
      features: input.features ?? {},
      limits: input.limits ?? {},
      status: PlanStatus.Active,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: PlanProps): Plan {
    return new Plan(id, props);
  }

  /** Number of months in one billing period. */
  get periodMonths(): number {
    return this.props.billingPeriod === BillingPeriod.Yearly ? 12 : 1;
  }

  get name(): string {
    return this.props.name;
  }
  get price(): Money {
    return this.props.price;
  }
  get currency(): string {
    return this.props.currency;
  }
  get billingPeriod(): BillingPeriod {
    return this.props.billingPeriod;
  }
  get features(): Record<string, unknown> {
    return this.props.features;
  }
  get limits(): Record<string, unknown> {
    return this.props.limits;
  }
  get status(): PlanStatus {
    return this.props.status;
  }
  get isActive(): boolean {
    return this.props.status === PlanStatus.Active;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
