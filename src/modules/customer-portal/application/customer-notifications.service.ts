import { Inject, Injectable } from '@nestjs/common';

import { BusinessRuleError } from '@shared/errors';

import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '@modules/clients/domain/repositories/client.repository';
import {
  NotificationFeedService,
  type FeedItemView,
} from '@modules/notifications/application/notification-feed.service';
import {
  PushService,
  type SubscribeInput,
  type VapidPublicKeyView,
} from '@modules/notifications/application/push.service';
import { RecipientType } from '@modules/notifications/domain/recipient-type.enum';

import type { CustomerPrincipal } from '@common/tenant/request-context';

/** Customer-facing wrapper over the notification feed + Web Push (recipient = client). */
@Injectable()
export class CustomerNotificationsService {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    private readonly feed: NotificationFeedService,
    private readonly push: PushService,
  ) {}

  async list(customer: CustomerPrincipal): Promise<FeedItemView[]> {
    const clientId = await this.resolveClientId(customer);
    if (!clientId) return [];
    return this.feed.list(customer.organizationId, RecipientType.Client, clientId);
  }

  async unreadCount(customer: CustomerPrincipal): Promise<{ count: number }> {
    const clientId = await this.resolveClientId(customer);
    if (!clientId) return { count: 0 };
    return this.feed.unreadCount(customer.organizationId, RecipientType.Client, clientId);
  }

  async markRead(customer: CustomerPrincipal, id: string): Promise<void> {
    const clientId = await this.resolveClientId(customer);
    if (!clientId) return;
    await this.feed.markRead(customer.organizationId, RecipientType.Client, clientId, id);
  }

  vapidPublicKey(): VapidPublicKeyView {
    return this.push.getVapidPublicKey();
  }

  async subscribe(customer: CustomerPrincipal, input: SubscribeInput): Promise<void> {
    const clientId = await this.resolveClientId(customer);
    if (!clientId) {
      throw new BusinessRuleError('Completá tu perfil antes de activar las notificaciones');
    }
    await this.push.subscribe(customer.organizationId, RecipientType.Client, clientId, input);
  }

  unsubscribe(customer: CustomerPrincipal, endpoint: string): Promise<void> {
    return this.push.unsubscribe(customer.organizationId, endpoint);
  }

  private async resolveClientId(customer: CustomerPrincipal): Promise<string | null> {
    const client = await this.clients.findByEmail(customer.organizationId, customer.email);
    return client?.id ?? null;
  }
}
