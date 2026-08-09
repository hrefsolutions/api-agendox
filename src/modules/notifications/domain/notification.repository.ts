import type { RecipientType } from './recipient-type.enum';

export interface NewNotification {
  id: string;
  organizationId: string;
  recipientType: RecipientType;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  appointmentId: string | null;
  createdAt: Date;
}

export interface NotificationItem extends NewNotification {
  readAt: Date | null;
}

export interface NotificationRepository {
  save(item: NewNotification): Promise<void>;
  /** Whether a notification of `type` already exists for the appointment (idempotency). */
  existsForAppointment(
    organizationId: string,
    appointmentId: string,
    type: string,
  ): Promise<boolean>;
  listByRecipient(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    limit: number,
  ): Promise<NotificationItem[]>;
  countUnread(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
  ): Promise<number>;
  markRead(
    organizationId: string,
    recipientType: RecipientType,
    recipientId: string,
    id: string,
    at: Date,
  ): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
