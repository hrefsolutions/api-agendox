import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Mirrors {@link BlockedTimeType}. */
export const blockedTimeTypeEnum = pgEnum('blocked_time_type', [
  'VACATION',
  'LICENSE',
  'MAINTENANCE',
  'MANUAL',
]);

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    color: text('color'),
    active: boolean('active').notNull().default(true),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('resources_org_active_idx').on(table.organizationId, table.active)],
);

export const resourceSchedules = pgTable(
  'resource_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    dayOfWeek: smallint('day_of_week').notNull(),
    startsAt: time('starts_at').notNull(),
    endsAt: time('ends_at').notNull(),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
  },
  (table) => [
    index('resource_schedules_org_resource_dow_idx').on(
      table.organizationId,
      table.resourceId,
      table.dayOfWeek,
    ),
  ],
);

export const blockedTimes = pgTable(
  'blocked_times',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    resourceId: uuid('resource_id'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    reason: text('reason'),
    type: blockedTimeTypeEnum('type').notNull(),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('blocked_times_org_resource_starts_idx').on(
      table.organizationId,
      table.resourceId,
      table.startsAt,
    ),
    index('blocked_times_org_starts_idx').on(table.organizationId, table.startsAt),
    check('blocked_times_valid_range', sql`${table.startsAt} < ${table.endsAt}`),
  ],
);

export const resourceServices = pgTable(
  'resource_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('resource_services_uq').on(table.organizationId, table.resourceId, table.serviceId),
  ],
);

export type ResourceRow = typeof resources.$inferSelect;
export type NewResourceRow = typeof resources.$inferInsert;
export type ResourceScheduleRow = typeof resourceSchedules.$inferSelect;
export type BlockedTimeRow = typeof blockedTimes.$inferSelect;
export type ResourceServiceRow = typeof resourceServices.$inferSelect;
