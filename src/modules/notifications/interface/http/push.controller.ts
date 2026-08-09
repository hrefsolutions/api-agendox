import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';

import { PushService } from '../../application/push.service';
import { RecipientType } from '../../domain/recipient-type.enum';
import { PushSubscribeRequest, PushUnsubscribeRequest } from './push.requests';

@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey(): { publicKey: string } {
    return this.push.getVapidPublicKey();
  }

  @Post('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(
    @TenantId() organizationId: string,
    @CurrentUser() principal: StaffPrincipal,
    @Body() body: PushSubscribeRequest,
  ): Promise<void> {
    return this.push.subscribe(organizationId, RecipientType.StaffUser, principal.userId, {
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      userAgent: body.userAgent,
    });
  }

  @Delete('subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @TenantId() organizationId: string,
    @Body() body: PushUnsubscribeRequest,
  ): Promise<void> {
    return this.push.unsubscribe(organizationId, body.endpoint);
  }
}
