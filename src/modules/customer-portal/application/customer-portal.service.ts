import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '@shared/errors';

import { SettingsService } from '@modules/settings/application/settings.service';
import { Client } from '@modules/clients/domain/entities/client.entity';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '@modules/clients/domain/repositories/client.repository';
import { AppointmentSource } from '@modules/appointments/domain/appointment-source.enum';
import { AppointmentStatus } from '@modules/appointments/domain/appointment-status.enum';
import { CreateAppointment } from '@modules/appointments/application/create-appointment.use-case';
import {
  toAppointmentView,
  type AppointmentView,
} from '@modules/appointments/application/appointment.view';
import {
  APPOINTMENT_REPOSITORY,
  type AppointmentRepository,
} from '@modules/appointments/domain/repositories/appointment.repository';

import type { CustomerPrincipal } from '@common/tenant/request-context';

export interface CustomerProfileView {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  phone: string | null;
}

export interface TransferInstructions {
  depositAmount: number;
  remainingAmount: number;
  bankName: string | null;
  accountHolder: string | null;
  alias: string | null;
  cbu: string | null;
  phone: string | null;
  instructions: string | null;
}

export interface CustomerAppointmentView extends AppointmentView {
  transfer: TransferInstructions | null;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  whatsapp: string;
  phone?: string | null;
}

export interface BookInput {
  serviceId: string;
  serviceOptionId: string;
  resourceId: string;
  startsAt: Date;
  idempotencyKey?: string | null;
}

@Injectable()
export class CustomerPortalService {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    private readonly settings: SettingsService,
    private readonly createAppointment: CreateAppointment,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getProfile(customer: CustomerPrincipal): Promise<CustomerProfileView | null> {
    const client = await this.clients.findByEmail(customer.organizationId, customer.email);
    return client ? toProfile(client) : null;
  }

  async updateProfile(
    customer: CustomerPrincipal,
    input: UpdateProfileInput,
  ): Promise<CustomerProfileView> {
    const now = this.clock.now();
    const existing = await this.clients.findByEmail(customer.organizationId, customer.email);
    const client =
      existing ??
      Client.create({
        organizationId: customer.organizationId,
        email: customer.email,
        firstName: input.firstName,
        lastName: input.lastName,
        whatsapp: input.whatsapp,
        phone: input.phone ?? null,
        now,
      });
    if (existing) {
      existing.update(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          whatsapp: input.whatsapp,
          phone: input.phone ?? null,
        },
        now,
      );
    }
    await this.clients.save(client);
    return toProfile(client);
  }

  async book(customer: CustomerPrincipal, input: BookInput): Promise<CustomerAppointmentView> {
    const booking = await this.settings.getBooking(customer.organizationId);
    if (!booking.publicBookingEnabled) {
      throw new ForbiddenError('La reserva pública está deshabilitada para este negocio');
    }
    const client = await this.clients.findByEmail(customer.organizationId, customer.email);
    if (!client) {
      throw new BusinessRuleError('Completá tu perfil antes de reservar');
    }
    const view = await this.createAppointment.execute(customer.organizationId, {
      serviceId: input.serviceId,
      serviceOptionId: input.serviceOptionId,
      resourceId: input.resourceId,
      clientId: client.id,
      startsAt: input.startsAt,
      source: AppointmentSource.Public,
      idempotencyKey: input.idempotencyKey ?? null,
    });
    return this.withTransfer(customer.organizationId, view);
  }

  async listAppointments(customer: CustomerPrincipal): Promise<AppointmentView[]> {
    const client = await this.clients.findByEmail(customer.organizationId, customer.email);
    if (!client) return [];
    const all = await this.appointments.listByClient(customer.organizationId, client.id);
    return all.map(toAppointmentView);
  }

  async getAppointment(customer: CustomerPrincipal, id: string): Promise<CustomerAppointmentView> {
    const client = await this.clients.findByEmail(customer.organizationId, customer.email);
    if (!client) {
      throw new NotFoundError('Turno no encontrado');
    }
    const appointment = await this.appointments.findById(customer.organizationId, id);
    if (!appointment || appointment.clientId !== client.id) {
      throw new NotFoundError('Turno no encontrado');
    }
    return this.withTransfer(customer.organizationId, toAppointmentView(appointment));
  }

  private async withTransfer(
    organizationId: string,
    view: AppointmentView,
  ): Promise<CustomerAppointmentView> {
    if (view.status !== AppointmentStatus.PendingDeposit) {
      return { ...view, transfer: null };
    }
    const payment = await this.settings.getPayment(organizationId);
    return {
      ...view,
      transfer: {
        depositAmount: view.depositAmount,
        remainingAmount: view.remainingAmount,
        bankName: payment.bankName,
        accountHolder: payment.accountHolder,
        alias: payment.alias,
        cbu: payment.cbu,
        phone: payment.phone,
        instructions: payment.instructions,
      },
    };
  }
}

function toProfile(client: Client): CustomerProfileView {
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    whatsapp: client.whatsapp,
    phone: client.phone,
  };
}
