import { Module } from '@nestjs/common';

import { ClientsModule } from '@modules/clients/clients.module';
import { ResourcesModule } from '@modules/resources/resources.module';
import { ServicesModule } from '@modules/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';

import { AppointmentsService } from './application/appointments.service';
import { CreateAppointment } from './application/create-appointment.use-case';
import { DepositsService } from './application/deposits.service';
import { ExpireStaleDeposits } from './application/expire-stale-deposits.job';
import { APPOINTMENT_REPOSITORY } from './domain/repositories/appointment.repository';
import { DEPOSIT_REPOSITORY } from './domain/repositories/deposit.repository';
import { AppointmentBusyAdapter } from './infrastructure/appointment-busy.adapter';
import { DrizzleAppointmentRepository } from './infrastructure/persistence/drizzle-appointment.repository';
import { DrizzleDepositRepository } from './infrastructure/persistence/drizzle-deposit.repository';
import { AppointmentsController } from './interface/http/appointments.controller';
import { DepositsController } from './interface/http/deposits.controller';

/**
 * Appointments module (M5 + M7). Owns appointments and deposits — kept together
 * because their lifecycles are coupled (confirming a deposit confirms its
 * appointment). Exports {@link APPOINTMENT_REPOSITORY} and the
 * {@link AppointmentBusyAdapter} that feeds the availability engine (M4).
 */
@Module({
  imports: [SettingsModule, ServicesModule, ResourcesModule, ClientsModule, SubscriptionsModule],
  controllers: [AppointmentsController, DepositsController],
  providers: [
    { provide: APPOINTMENT_REPOSITORY, useClass: DrizzleAppointmentRepository },
    { provide: DEPOSIT_REPOSITORY, useClass: DrizzleDepositRepository },
    CreateAppointment,
    AppointmentsService,
    DepositsService,
    ExpireStaleDeposits,
    AppointmentBusyAdapter,
  ],
  exports: [APPOINTMENT_REPOSITORY, AppointmentBusyAdapter, CreateAppointment],
})
export class AppointmentsModule {}
