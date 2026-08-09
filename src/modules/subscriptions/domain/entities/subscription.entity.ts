import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

import { SubscriptionStatus } from '../subscription-status.enum';

interface SubscriptionProps {
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startsAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  providerSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A tenant's SaaS subscription. Only one active subscription per organization. */
export class Subscription extends AggregateRoot {
  private constructor(
    id: string,
    private props: SubscriptionProps,
  ) {
    super(id);
  }

  /**
   * Starts a checkout: creates the subscription in PENDING (no access granted)
   * until the payment gateway confirms authorization via webhook. The period
   * bounds are placeholders until the first authorized charge.
   */
  static startCheckout(input: {
    organizationId: string;
    planId: string;
    now: Date;
  }): Subscription {
    return new Subscription(randomUUID(), {
      organizationId: input.organizationId,
      planId: input.planId,
      status: SubscriptionStatus.Pending,
      startsAt: input.now,
      currentPeriodStart: input.now,
      currentPeriodEnd: input.now,
      cancelledAt: null,
      providerSubscriptionId: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: SubscriptionProps): Subscription {
    return new Subscription(id, props);
  }

  /** Records the gateway's subscription id once the checkout is created. */
  attachProvider(providerSubscriptionId: string, now: Date): void {
    this.props.providerSubscriptionId = providerSubscriptionId;
    this.props.updatedAt = now;
  }

  /**
   * Marks the subscription active for a billing period (on authorization or an
   * approved recurring charge). Idempotent-friendly: always (re)opens the period.
   */
  activateForPeriod(currentPeriodEnd: Date, now: Date): void {
    this.props.status = SubscriptionStatus.Active;
    this.props.currentPeriodStart = now;
    this.props.currentPeriodEnd = currentPeriodEnd;
    this.props.cancelledAt = null;
    this.props.updatedAt = now;
  }

  /** A recurring charge failed; access continues until the period end. */
  markPastDue(now: Date): void {
    this.props.status = SubscriptionStatus.PastDue;
    this.props.updatedAt = now;
  }

  /** Provider paused the subscription (e.g. after repeated failures). */
  suspend(now: Date): void {
    this.props.status = SubscriptionStatus.Suspended;
    this.props.updatedAt = now;
  }

  /** The current period elapsed without a renewal. */
  expire(now: Date): void {
    this.props.status = SubscriptionStatus.Expired;
    this.props.updatedAt = now;
  }

  cancel(now: Date): void {
    this.props.status = SubscriptionStatus.Cancelled;
    this.props.cancelledAt = now;
    this.props.updatedAt = now;
  }

  /** Active and within the current billing period. */
  isActiveAt(now: Date): boolean {
    return (
      this.props.status === SubscriptionStatus.Active &&
      this.props.currentPeriodEnd.getTime() > now.getTime()
    );
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get planId(): string {
    return this.props.planId;
  }
  get status(): SubscriptionStatus {
    return this.props.status;
  }
  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }
  get providerSubscriptionId(): string | null {
    return this.props.providerSubscriptionId;
  }
  get snapshot(): Readonly<SubscriptionProps> {
    return this.props;
  }
}
