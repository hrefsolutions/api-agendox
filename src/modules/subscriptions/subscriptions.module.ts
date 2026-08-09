import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

import { ORGANIZATION_ACCESS } from '@modules/appointments/application/ports/organization-access.port';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { PlansModule } from '@modules/plans/plans.module';
import { TrialsModule } from '@modules/trials/trials.module';

import type { PaymentConfig } from '@config/configuration';

import { CancelSubscription } from './application/cancel-subscription.use-case';
import { ExpireSubscriptionsJob } from './application/expire-subscriptions.job';
import { GetSubscriptionStatus } from './application/get-subscription-status.use-case';
import { HandleSubscriptionWebhook } from './application/handle-subscription-webhook.use-case';
import { OrganizationAccessService } from './application/organization-access.service';
import { StartSubscriptionCheckout } from './application/start-subscription-checkout.use-case';
import { SyncSubscriptionFromProvider } from './application/sync-subscription-from-provider.use-case';
import { PAYMENT_GATEWAY, type PaymentGateway } from './application/ports/payment-gateway.port';
import { SUBSCRIPTION_REPOSITORY } from './domain/repositories/subscription.repository';
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/drizzle-subscription.repository';
import { MercadoPagoGateway } from './infrastructure/mercado-pago.gateway';
import { MockPaymentGateway } from './infrastructure/mock-payment.gateway';
import { SubscriptionsController } from './interface/http/subscriptions.controller';

/**
 * Subscriptions module (M9; billing integrated in MS3). Trials/subscriptions
 * gate + real payment via Mercado Pago (recurring preapproval) or a dev mock,
 * selected by `PAYMENT_PROVIDER`. Binds the appointments {@link ORGANIZATION_ACCESS}
 * port so appointment creation is blocked without an active trial or subscription.
 */
@Module({
  imports: [PlansModule, TrialsModule, OrganizationsModule],
  controllers: [SubscriptionsController],
  providers: [
    { provide: SUBSCRIPTION_REPOSITORY, useClass: DrizzleSubscriptionRepository },
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, Logger],
      useFactory: (configService: ConfigService, logger: Logger): PaymentGateway => {
        const payment = configService.getOrThrow<PaymentConfig>('payment');
        if (payment.provider === 'mercadopago') {
          return new MercadoPagoGateway(
            payment.mercadoPago.accessToken,
            payment.mercadoPago.webhookSecret,
            logger,
          );
        }
        return new MockPaymentGateway(payment.apiPublicUrl);
      },
    },
    OrganizationAccessService,
    { provide: ORGANIZATION_ACCESS, useExisting: OrganizationAccessService },
    StartSubscriptionCheckout,
    SyncSubscriptionFromProvider,
    HandleSubscriptionWebhook,
    CancelSubscription,
    GetSubscriptionStatus,
    ExpireSubscriptionsJob,
  ],
  exports: [ORGANIZATION_ACCESS, SUBSCRIPTION_REPOSITORY],
})
export class SubscriptionsModule {}
