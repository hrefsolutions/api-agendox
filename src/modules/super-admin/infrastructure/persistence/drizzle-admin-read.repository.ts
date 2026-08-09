import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

type OrgStatusValue = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

import { appointments } from '@modules/appointments/infrastructure/persistence/appointment.schema';
import { organizations } from '@modules/organizations/infrastructure/persistence/organization.schema';
import { plans } from '@modules/plans/infrastructure/persistence/plan.schema';
import { subscriptions } from '@modules/subscriptions/infrastructure/persistence/subscription.schema';
import { trials } from '@modules/trials/infrastructure/persistence/trial.schema';
import { users } from '@modules/users/infrastructure/persistence/user.schema';

import type {
  AdminMetrics,
  AdminOrgDetail,
  AdminOrgListItem,
  AdminReadRepository,
  OrganizationFilter,
} from '../../application/ports/admin-read.repository';

@Injectable()
export class DrizzleAdminReadRepository extends BaseDrizzleRepository implements AdminReadRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async listOrganizations(
    filter: OrganizationFilter,
    limit: number,
  ): Promise<AdminOrgListItem[]> {
    const conditions: SQL[] = [];
    if (filter.status) conditions.push(eq(organizations.status, filter.status as OrgStatusValue));
    if (filter.q && filter.q.trim() !== '') {
      const term = `%${filter.q.trim()}%`;
      conditions.push(or(ilike(organizations.name, term), ilike(organizations.slug, term))!);
    }

    const orgRows = await this.executor
      .select()
      .from(organizations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(organizations.createdAt))
      .limit(limit);

    if (orgRows.length === 0) return [];

    const orgIds = orgRows.map((o) => o.id);
    const latestByOrg = await this.latestSubscriptionByOrg(orgIds);

    return orgRows.map((o) => {
      const sub = latestByOrg.get(o.id);
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        timezone: o.timezone,
        createdAt: o.createdAt,
        subscriptionStatus: sub?.status ?? null,
        planName: sub?.planName ?? null,
      };
    });
  }

  async getOrganizationDetail(id: string): Promise<AdminOrgDetail | null> {
    const orgRows = await this.executor
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    const o = orgRows[0];
    if (!o) return null;

    const [ownerRows, latestByOrg, trialRows, userCount, appointmentCount] = await Promise.all([
      this.executor
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.organizationId, id), eq(users.role, 'OWNER')))
        .limit(1),
      this.latestSubscriptionByOrg([id]),
      this.executor
        .select({ status: trials.status, endsAt: trials.endsAt })
        .from(trials)
        .where(eq(trials.organizationId, id))
        .orderBy(desc(trials.createdAt))
        .limit(1),
      this.executor.$count(users, eq(users.organizationId, id)),
      this.executor.$count(appointments, eq(appointments.organizationId, id)),
    ]);

    const sub = latestByOrg.get(id);
    const trial = trialRows[0] ?? null;

    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status,
      timezone: o.timezone,
      createdAt: o.createdAt,
      subscriptionStatus: sub?.status ?? null,
      planName: sub?.planName ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      ownerEmail: ownerRows[0]?.email ?? null,
      trial: trial ? { status: trial.status, endsAt: trial.endsAt } : null,
      counts: { users: userCount, appointments: appointmentCount },
    };
  }

  async getMetrics(now: Date): Promise<AdminMetrics> {
    const [statusRows, activeSubs, activeTrials, totalAppointments] = await Promise.all([
      this.executor
        .select({ status: organizations.status, c: sql<number>`count(*)::int` })
        .from(organizations)
        .groupBy(organizations.status),
      this.executor.$count(
        subscriptions,
        and(eq(subscriptions.status, 'ACTIVE'), gt(subscriptions.currentPeriodEnd, now)),
      ),
      this.executor.$count(trials, and(eq(trials.status, 'ACTIVE'), gt(trials.endsAt, now))),
      this.executor.$count(appointments),
    ]);

    const byStatus = new Map(statusRows.map((r) => [r.status, r.c]));
    const trial = byStatus.get('TRIAL') ?? 0;
    const active = byStatus.get('ACTIVE') ?? 0;
    const suspended = byStatus.get('SUSPENDED') ?? 0;
    const disabled = byStatus.get('DISABLED') ?? 0;

    return {
      organizations: {
        total: trial + active + suspended + disabled,
        trial,
        active,
        suspended,
        disabled,
      },
      activeSubscriptions: activeSubs,
      activeTrials,
      totalAppointments,
    };
  }

  /** Most recent subscription per organization, with its plan name. */
  private async latestSubscriptionByOrg(
    orgIds: string[],
  ): Promise<Map<string, { status: string; planName: string | null; currentPeriodEnd: Date }>> {
    const rows = await this.executor
      .select({
        organizationId: subscriptions.organizationId,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        createdAt: subscriptions.createdAt,
        planName: plans.name,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(inArray(subscriptions.organizationId, orgIds))
      .orderBy(desc(subscriptions.createdAt));

    const map = new Map<string, { status: string; planName: string | null; currentPeriodEnd: Date }>();
    for (const row of rows) {
      // rows are newest-first; keep the first seen per org.
      if (!map.has(row.organizationId)) {
        map.set(row.organizationId, {
          status: row.status,
          planName: row.planName ?? null,
          currentPeriodEnd: row.currentPeriodEnd,
        });
      }
    }
    return map;
  }
}
