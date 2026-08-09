import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';

import { CLOCK, type Clock } from '@shared/application';

import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '@modules/appointments/domain/repositories/appointment.repository';
import { SettingsService } from '@modules/settings/application/settings.service';
import type { NotificationSettings } from '@modules/settings/domain/settings.types';

import { NotificationDispatcher } from './notification.dispatcher';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../domain/notification.repository';

const REMINDER_TYPE = 'APPOINTMENT_REMINDER';
const HOUR_MS = 60 * 60 * 1000;
/** Widest lead time we look ahead; matches the settings form's max (168h = 1 week). */
const MAX_LEAD_HOURS = 168;
const BATCH_SIZE = 200;

/**
 * Sends a one-time reminder to the client before a CONFIRMED appointment, per
 * the tenant's `reminderHoursBefore`. Cross-tenant, single-instance for the MVP.
 * Idempotent: a reminder is skipped if the feed already has one for the turn
 * (see {@link NotificationRepository.existsForAppointment}).
 */
@Injectable()
export class AppointmentReminderJob {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly feed: NotificationRepository,
    private readonly settings: SettingsService,
    private readonly dispatcher: NotificationDispatcher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly logger: Logger,
  ) { }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run(): Promise<void> {
    const now = this.clock.now();
    const nowMs = now.getTime();
    const due = await this.appointments.findConfirmedStartingBetween(
      nowMs,
      nowMs + MAX_LEAD_HOURS * HOUR_MS,
      BATCH_SIZE,
    );
    if (due.length === 0) return;

    const settingsByOrg = new Map<string, NotificationSettings>();
    let sent = 0;

    for (const appointment of due) {
      const orgId = appointment.organizationId;
      let orgSettings = settingsByOrg.get(orgId);
      if (!orgSettings) {
        orgSettings = await this.settings.getNotification(orgId);
        settingsByOrg.set(orgId, orgSettings);
      }
      if (!orgSettings.remindersEnabled) continue;

      // Only once we're within the lead window (`startsAt - reminderHoursBefore`).
      const thresholdMs = appointment.startsAt.getTime() - orgSettings.reminderHoursBefore * HOUR_MS;
      if (nowMs < thresholdMs) continue;

      if (await this.feed.existsForAppointment(orgId, appointment.id, REMINDER_TYPE)) continue;

      await this.dispatcher.sendReminder(appointment);
      sent += 1;
    }

    if (sent > 0) this.logger.log(`Sent ${sent} appointment reminder(s)`);
  }
}
