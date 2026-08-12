import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter, CommonModule, EventsModule } from '@common/index';
import { ConfigModule, createLoggerOptions } from '@config/index';
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from '@health/health.module';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { ClientsModule } from '@modules/clients/clients.module';
import { CustomerPortalModule } from '@modules/customer-portal/customer-portal.module';
import { LegalModule } from '@modules/legal/legal.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { PlansModule } from '@modules/plans/plans.module';
import { ResourcesModule } from '@modules/resources/resources.module';
import { ServicesModule } from '@modules/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';
import { SuperAdminModule } from '@modules/super-admin/super-admin.module';
import { TrialsModule } from '@modules/trials/trials.module';
import { UsersModule } from '@modules/users/users.module';

/**
 * Application root module (composition root).
 *
 * Wires platform-level infrastructure (config, logging, database, events,
 * cross-cutting concerns) and the domain feature modules of Milestone 1.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createLoggerOptions,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Baseline rate limiting: 120 requests / minute per IP (tighter on auth/OTP).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DatabaseModule,
    CommonModule,
    EventsModule,
    HealthModule,
    // Feature modules (Milestone 1).
    UsersModule,
    TrialsModule,
    AuthenticationModule,
    OrganizationsModule,
    // Business configuration (Milestone 2).
    SettingsModule,
    // Resources, services and clients (Milestone 3).
    ClientsModule,
    ServicesModule,
    ResourcesModule,
    // Appointments + deposits (Milestones 5 & 7).
    AppointmentsModule,
    // Availability engine (Milestone 4).
    AvailabilityModule,
    // Public portal + Customer Portal (Milestone 6).
    CustomerPortalModule,
    // Notifications: email + in-app feed + Web Push (Milestone 8).
    NotificationsModule,
    // Plans, subscriptions and the operation gate (Milestone 9).
    PlansModule,
    SubscriptionsModule,
    // Platform super admin (MS5).
    SuperAdminModule,
    // Aceptación de Términos y Condiciones.
    LegalModule,
  ],
  providers: [
    {
      // Global exception filter, registered via DI so it receives the logger.
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      // Global rate limiter.
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
