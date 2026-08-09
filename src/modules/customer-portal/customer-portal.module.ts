import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { AvailabilityModule } from '@modules/availability/availability.module';
import { ClientsModule } from '@modules/clients/clients.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { ResourcesModule } from '@modules/resources/resources.module';
import { ServicesModule } from '@modules/services/services.module';
import { SettingsModule } from '@modules/settings/settings.module';

import { CustomerNotificationsService } from './application/customer-notifications.service';
import { CustomerPortalService } from './application/customer-portal.service';
import { PublicService } from './application/public.service';
import { RequestCustomerOtp } from './application/request-customer-otp.use-case';
import { ValidateCustomerOtp } from './application/validate-customer-otp.use-case';
import { CUSTOMER_OTP_REPOSITORY } from './domain/customer-otp.repository';
import { CustomerTokenService } from './infrastructure/customer-token.service';
import { DrizzleCustomerOtpRepository } from './infrastructure/persistence/drizzle-customer-otp.repository';
import { CustomerNotificationsController } from './interface/http/customer-notifications.controller';
import { CustomerOtpGuard } from './interface/http/customer-otp.guard';
import { CustomerPortalController } from './interface/http/customer-portal.controller';
import { PublicController } from './interface/http/public.controller';

/**
 * Customer Portal + public booking (M6). Public surface by slug, OTP email
 * login, Customer Profile, public booking (reuses `CreateAppointment`) and the
 * customer's own appointments. Owns customer authentication (separate token) so
 * the staff `authentication` module stays focused.
 */
@Module({
  imports: [
    JwtModule.register({}),
    OrganizationsModule,
    ServicesModule,
    ResourcesModule,
    ClientsModule,
    AppointmentsModule,
    AvailabilityModule,
    SettingsModule,
    AuthenticationModule,
    NotificationsModule,
  ],
  controllers: [PublicController, CustomerPortalController, CustomerNotificationsController],
  providers: [
    { provide: CUSTOMER_OTP_REPOSITORY, useClass: DrizzleCustomerOtpRepository },
    CustomerTokenService,
    CustomerOtpGuard,
    RequestCustomerOtp,
    ValidateCustomerOtp,
    PublicService,
    CustomerPortalService,
    CustomerNotificationsService,
  ],
})
export class CustomerPortalModule {}
