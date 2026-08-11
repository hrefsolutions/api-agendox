import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentCustomer } from '@common/decorators/current-customer.decorator';
import { Public } from '@common/decorators/public.decorator';
import type { CustomerPrincipal } from '@common/tenant/request-context';

import type { FeedItemView } from '@modules/notifications/application/notification-feed.service';
import type { VapidPublicKeyView } from '@modules/notifications/application/push.service';
import {
  PushSubscribeRequest,
  PushUnsubscribeRequest,
} from '@modules/notifications/interface/http/push.requests';

import { CustomerNotificationsService } from '../../application/customer-notifications.service';
import { CustomerOtpGuard } from './customer-otp.guard';

@ApiTags('customer-portal')
@ApiBearerAuth()
@Public()
@UseGuards(CustomerOtpGuard)
@Controller('portal')
export class CustomerNotificationsController {
  constructor(private readonly notifications: CustomerNotificationsService) {}

  @Get('notifications')
  list(@CurrentCustomer() customer: CustomerPrincipal): Promise<FeedItemView[]> {
    return this.notifications.list(customer);
  }

  @Get('notifications/unread-count')
  unreadCount(@CurrentCustomer() customer: CustomerPrincipal): Promise<{ count: number }> {
    return this.notifications.unreadCount(customer);
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentCustomer() customer: CustomerPrincipal, @Param('id') id: string): Promise<void> {
    return this.notifications.markRead(customer, id);
  }

  @Get('push/vapid-public-key')
  vapidPublicKey(): VapidPublicKeyView {
    return this.notifications.vapidPublicKey();
  }

  @Post('push/subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() body: PushSubscribeRequest,
  ): Promise<void> {
    return this.notifications.subscribe(customer, {
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      userAgent: body.userAgent,
    });
  }

  @Delete('push/subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @CurrentCustomer() customer: CustomerPrincipal,
    @Body() body: PushUnsubscribeRequest,
  ): Promise<void> {
    return this.notifications.unsubscribe(customer, body.endpoint);
  }
}
