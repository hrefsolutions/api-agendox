import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsUUID } from 'class-validator';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import type { AppConfig, PaymentConfig } from '@config/configuration';
import { Role } from '@shared/domain';
import { NotFoundError } from '@shared/errors';
import type { StaffPrincipal } from '@common/tenant/request-context';

import { CancelSubscription } from '../../application/cancel-subscription.use-case';
import {
  StartSubscriptionCheckout,
  type CheckoutView,
} from '../../application/start-subscription-checkout.use-case';
import { GetSubscriptionStatus } from '../../application/get-subscription-status.use-case';
import { HandleSubscriptionWebhook } from '../../application/handle-subscription-webhook.use-case';
import { SyncSubscriptionFromProvider } from '../../application/sync-subscription-from-provider.use-case';
import type { SubscriptionStatusView } from '../../application/subscription.dto';

export class CheckoutRequest {
  @ApiProperty() @IsUUID() planId!: string;
}

@ApiTags('subscriptions')
@Controller('subscription')
export class SubscriptionsController {
  private readonly payment: PaymentConfig;
  private readonly dashboardUrl: string;

  constructor(
    private readonly getStatus: GetSubscriptionStatus,
    private readonly checkout: StartSubscriptionCheckout,
    private readonly cancelSub: CancelSubscription,
    private readonly webhook: HandleSubscriptionWebhook,
    private readonly sync: SyncSubscriptionFromProvider,
    configService: ConfigService,
  ) {
    this.payment = configService.getOrThrow<PaymentConfig>('payment');
    this.dashboardUrl = configService.getOrThrow<AppConfig>('app').dashboardUrl;
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.Owner, Role.Admin)
  status(@TenantId() organizationId: string): Promise<SubscriptionStatusView> {
    return this.getStatus.execute(organizationId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @Roles(Role.Owner)
  startCheckout(
    @TenantId() organizationId: string,
    @CurrentUser() user: StaffPrincipal,
    @Body() body: CheckoutRequest,
  ): Promise<CheckoutView> {
    return this.checkout.execute(organizationId, body.planId, user.email);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @Roles(Role.Owner)
  @HttpCode(204)
  async cancel(@TenantId() organizationId: string): Promise<void> {
    await this.cancelSub.execute(organizationId);
  }

  /** Payment gateway webhook (public; authenticity verified by the adapter). */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Headers() headers: Record<string, string | undefined>,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ): Promise<{ received: boolean }> {
    await this.webhook.execute({ headers, query, body });
    return { received: true };
  }

  /**
   * Dev-only: simulates the payer authorizing the (mock) checkout, then returns
   * to the dashboard. Only mounted behind `PAYMENT_PROVIDER=mock`; hidden (404)
   * otherwise so it can never activate a subscription in production.
   */
  @Get('mock/authorize')
  @Public()
  @ApiExcludeEndpoint()
  async mockAuthorize(@Query('sub') sub: string, @Res() res: Response): Promise<void> {
    if (this.payment.provider !== 'mock') {
      throw new NotFoundError('No disponible');
    }
    await this.sync.apply({
      providerSubscriptionId: `mock_${sub}`,
      status: 'AUTHORIZED',
      paymentApproved: true,
    });
    res.redirect(`${this.dashboardUrl}/subscription?status=success`);
  }
}
