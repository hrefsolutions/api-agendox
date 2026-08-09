import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';

import {
  NotificationFeedService,
  type FeedItemView,
} from '../../application/notification-feed.service';
import { RecipientType } from '../../domain/recipient-type.enum';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly feed: NotificationFeedService) {}

  @Get()
  list(
    @TenantId() organizationId: string,
    @CurrentUser() principal: StaffPrincipal,
  ): Promise<FeedItemView[]> {
    return this.feed.list(organizationId, RecipientType.StaffUser, principal.userId);
  }

  @Get('unread-count')
  unreadCount(
    @TenantId() organizationId: string,
    @CurrentUser() principal: StaffPrincipal,
  ): Promise<{ count: number }> {
    return this.feed.unreadCount(organizationId, RecipientType.StaffUser, principal.userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @TenantId() organizationId: string,
    @CurrentUser() principal: StaffPrincipal,
    @Param('id') id: string,
  ): Promise<void> {
    return this.feed.markRead(organizationId, RecipientType.StaffUser, principal.userId, id);
  }
}
