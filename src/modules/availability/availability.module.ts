import { Module } from '@nestjs/common';

import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AppointmentBusyAdapter } from '@modules/appointments/infrastructure/appointment-busy.adapter';
import { ResourcesModule } from '@modules/resources/resources.module';
import { ServicesModule } from '@modules/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';

import { CalculateAvailability } from './application/calculate-availability.use-case';
import { APPOINTMENT_BUSY_PROVIDER } from './application/appointment-busy.port';
import { AvailabilityController } from './interface/http/availability.controller';

/**
 * Availability module (M4). Computes bookable slots in real time; it owns no
 * tables (BR-070). The {@link APPOINTMENT_BUSY_PROVIDER} is backed by the
 * appointments module (M5) so already-booked times are excluded. Exports
 * {@link CalculateAvailability} so booking flows can reuse it.
 */
@Module({
  imports: [SettingsModule, ServicesModule, ResourcesModule, AppointmentsModule],
  controllers: [AvailabilityController],
  providers: [
    CalculateAvailability,
    { provide: APPOINTMENT_BUSY_PROVIDER, useExisting: AppointmentBusyAdapter },
  ],
  exports: [CalculateAvailability],
})
export class AvailabilityModule {}
