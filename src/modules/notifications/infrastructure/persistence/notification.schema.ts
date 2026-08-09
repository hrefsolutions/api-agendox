import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Mirrors {@link RecipientType}. */
export const notificationRecipientTypeEnum = pgEnum('notification_recipient_type', [
  'STAFF_USER',
  'CLIENT',
]);

/** In-app notification feed (polled by the clients; also the delivery record). */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    recipientType: notificationRecipientTypeEnum('recipient_type').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    appointmentId: uuid('appointment_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notifications_recipient_idx').on(
      table.organizationId,
      table.recipientType,
      table.recipientId,
      table.createdAt,
    ),
  ],
);

/** Web Push subscriptions per recipient. */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    recipientType: notificationRecipientTypeEnum('recipient_type').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_uq').on(table.endpoint),
    index('push_subscriptions_recipient_idx').on(
      table.organizationId,
      table.recipientType,
      table.recipientId,
    ),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
