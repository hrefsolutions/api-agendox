import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

import type { MailConfig } from '@config/configuration';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { UsersModule } from '@modules/users/users.module';

import { AppointmentReminderJob } from './application/appointment-reminder.job';
import { NotificationDispatcher } from './application/notification.dispatcher';
import { NotificationFeedService } from './application/notification-feed.service';
import { PushService } from './application/push.service';
import { EMAIL_SENDER, type EmailSender } from './application/ports/email-sender.port';
import { PUSH_SENDER } from './application/ports/push-sender.port';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { PUSH_SUBSCRIPTION_REPOSITORY } from './domain/push-subscription.repository';
import { EmailTemplateRenderer } from './infrastructure/email-template-renderer';
import { LogEmailSender } from './infrastructure/log-email-sender';
import { NodemailerSmtpSender } from './infrastructure/nodemailer-smtp-sender';
import { WebPushSender } from './infrastructure/web-push-sender';
import { DrizzleNotificationRepository } from './infrastructure/persistence/drizzle-notification.repository';
import { DrizzlePushSubscriptionRepository } from './infrastructure/persistence/drizzle-push-subscription.repository';
import { NotificationsController } from './interface/http/notifications.controller';
import { PushController } from './interface/http/push.controller';

/**
 * Notifications module (M8; email transport reworked in M-Mail). Fans domain
 * events out to email (SMTP/log, rendered from HTML templates), in-app feed
 * (polled) and Web Push. Exports the feed and push services so the Customer
 * Portal can offer the same to end customers.
 */
@Module({
  imports: [AppointmentsModule, UsersModule, SettingsModule],
  controllers: [NotificationsController, PushController],
  providers: [
    EmailTemplateRenderer,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, EmailTemplateRenderer, Logger],
      useFactory: (
        configService: ConfigService,
        renderer: EmailTemplateRenderer,
        logger: Logger,
      ): EmailSender => {
        const mail = configService.getOrThrow<MailConfig>('mail');
        if (mail.provider === 'smtp') {
          return new NodemailerSmtpSender(mail.from, mail.smtp, renderer, logger);
        }
        return new LogEmailSender(renderer, logger);
      },
    },
    { provide: NOTIFICATION_REPOSITORY, useClass: DrizzleNotificationRepository },
    { provide: PUSH_SUBSCRIPTION_REPOSITORY, useClass: DrizzlePushSubscriptionRepository },
    { provide: PUSH_SENDER, useClass: WebPushSender },
    NotificationFeedService,
    PushService,
    NotificationDispatcher,
    AppointmentReminderJob,
  ],
  exports: [EMAIL_SENDER, NotificationFeedService, PushService],
})
export class NotificationsModule {}
