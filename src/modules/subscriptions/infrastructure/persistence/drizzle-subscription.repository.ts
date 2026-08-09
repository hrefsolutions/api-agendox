import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { Subscription } from '../../domain/entities/subscription.entity';
import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';
import { subscriptions } from './subscription.schema';
import type { SubscriptionRow } from './subscription.schema';

@Injectable()
export class DrizzleSubscriptionRepository
  extends BaseDrizzleRepository
  implements SubscriptionRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findCurrentByOrganization(organizationId: string): Promise<Subscription | null> {
    const rows = await this.executor
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findActiveByOrganization(organizationId: string): Promise<Subscription | null> {
    const rows = await this.executor
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, organizationId),
          eq(subscriptions.status, SubscriptionStatus.Active),
        ),
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByProviderSubscriptionId(
    providerSubscriptionId: string,
  ): Promise<Subscription | null> {
    const rows = await this.executor
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findExpired(before: Date, limit: number): Promise<Subscription[]> {
    const rows = await this.executor
      .select()
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.status, [
            SubscriptionStatus.Active,
            SubscriptionStatus.PastDue,
          ]),
          lt(subscriptions.currentPeriodEnd, before),
        ),
      )
      .limit(limit);
    return rows.map(toDomain);
  }

  async save(subscription: Subscription): Promise<void> {
    const s = subscription.snapshot;
    await this.executor
      .insert(subscriptions)
      .values({
        id: subscription.id,
        organizationId: s.organizationId,
        planId: s.planId,
        status: s.status,
        startsAt: s.startsAt,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelledAt: s.cancelledAt,
        providerSubscriptionId: s.providerSubscriptionId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: {
          status: s.status,
          currentPeriodStart: s.currentPeriodStart,
          currentPeriodEnd: s.currentPeriodEnd,
          cancelledAt: s.cancelledAt,
          providerSubscriptionId: s.providerSubscriptionId,
          updatedAt: s.updatedAt,
        },
      });
  }
}

function toDomain(row: SubscriptionRow): Subscription {
  return Subscription.fromPersistence(row.id, {
    organizationId: row.organizationId,
    planId: row.planId,
    status: row.status as SubscriptionStatus,
    startsAt: row.startsAt,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelledAt: row.cancelledAt,
    providerSubscriptionId: row.providerSubscriptionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
