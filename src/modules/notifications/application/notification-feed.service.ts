import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../domain/notification.repository';
import type { RecipientType } from '../domain/recipient-type.enum';

export interface FeedItemView {
  id: string;
  type: string;
  title: string;
  body: string;
  appointmentId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

const FEED_PAGE_SIZE = 50;

/** Read side of the in-app notification feed (polled by dashboard/portal). */
@Injectable()
export class NotificationFeedService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<FeedItemView[]> {
    const items = await this.notifications.listByRecipient(
      organizationId,
      recipientType,
      recipientId,
      FEED_PAGE_SIZE,
    );
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      appointmentId: item.appointmentId,
      readAt: item.readAt,
      createdAt: item.createdAt,
    }));
  }

  async unreadCount(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<{ count: number }> {
    const count = await this.notifications.countUnread(organizationId, recipientType, recipientId);
    return { count };
  }

  markRead(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    id: string,
  ): Promise<void> {
    return this.notifications.markRead(
      organizationId,
      recipientType,
      recipientId,
      id,
      this.clock.now(),
    );
  }
}
