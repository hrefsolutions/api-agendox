import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type {
  NewNotification,
  NotificationItem,
  NotificationRepository,
} from '../../domain/notification.repository';
import { RecipientType } from '../../domain/recipient-type.enum';
import { notifications } from './notification.schema';

@Injectable()
export class DrizzleNotificationRepository
  extends BaseDrizzleRepository
  implements NotificationRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(item: NewNotification): Promise<void> {
    await this.executor.insert(notifications).values({
      id: item.id,
      organizationId: item.organizationId,
      recipientType: item.recipientType,
      recipientId: item.recipientId,
      type: item.type,
      title: item.title,
      body: item.body,
      appointmentId: item.appointmentId,
      createdAt: item.createdAt,
    });
  }

  async existsForAppointment(
    organizationId: string,
    appointmentId: string,
    type: string,
  ): Promise<boolean> {
    const rows = await this.executor
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.appointmentId, appointmentId),
          eq(notifications.type, type),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async listByRecipient(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    limit: number,
  ): Promise<NotificationItem[]> {
    const rows = await this.executor
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      recipientType: row.recipientType as RecipientType,
      recipientId: row.recipientId,
      type: row.type,
      title: row.title,
      body: row.body,
      appointmentId: row.appointmentId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  async countUnread(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<number> {
    const rows = await this.executor
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          isNull(notifications.readAt),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  async markRead(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.executor
      .update(notifications)
      .set({ readAt: at })
      .where(
        and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          eq(notifications.id, id),
        ),
      );
  }
}
