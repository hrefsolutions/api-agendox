import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { Money } from '@shared/domain';
import { NotFoundError } from '@shared/errors';

import { Service } from '../domain/entities/service.entity';
import { ServiceOption } from '../domain/entities/service-option.entity';
import {
  SERVICE_OPTION_REPOSITORY,
  type ServiceOptionRepository,
} from '../domain/repositories/service-option.repository';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../domain/repositories/service.repository';

export interface ServiceOptionView {
  id: string;
  serviceId: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface ServiceView {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface ServiceDetailView extends ServiceView {
  options: ServiceOptionView[];
}

@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_OPTION_REPOSITORY) private readonly options: ServiceOptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createService(
    organizationId: string,
    input: { name: string; description?: string | null },
  ): Promise<ServiceView> {
    const service = Service.create({ organizationId, ...input, now: this.clock.now() });
    await this.services.save(service);
    return toServiceView(service);
  }

  async updateService(
    organizationId: string,
    id: string,
    patch: { name?: string; description?: string | null; active?: boolean },
  ): Promise<ServiceView> {
    const service = await this.requireService(organizationId, id);
    service.update(patch, this.clock.now());
    await this.services.save(service);
    return toServiceView(service);
  }

  async listServices(organizationId: string): Promise<ServiceView[]> {
    const all = await this.services.list(organizationId);
    return all.map(toServiceView);
  }

  async getService(organizationId: string, id: string): Promise<ServiceDetailView> {
    const service = await this.requireService(organizationId, id);
    const options = await this.options.listByService(organizationId, id);
    return { ...toServiceView(service), options: options.map(toOptionView) };
  }

  async createOption(
    organizationId: string,
    serviceId: string,
    input: { durationMinutes: number; price: number },
  ): Promise<ServiceOptionView> {
    await this.requireService(organizationId, serviceId);
    const option = ServiceOption.create({
      organizationId,
      serviceId,
      durationMinutes: input.durationMinutes,
      price: Money.fromDecimalString(input.price.toFixed(2)),
      now: this.clock.now(),
    });
    await this.options.save(option);
    return toOptionView(option);
  }

  async updateOption(
    organizationId: string,
    optionId: string,
    patch: { durationMinutes?: number; price?: number; active?: boolean },
  ): Promise<ServiceOptionView> {
    const option = await this.options.findById(organizationId, optionId);
    if (!option) {
      throw new NotFoundError('Opción de servicio no encontrada');
    }
    option.update(
      {
        durationMinutes: patch.durationMinutes,
        price:
          patch.price === undefined ? undefined : Money.fromDecimalString(patch.price.toFixed(2)),
        active: patch.active,
      },
      this.clock.now(),
    );
    await this.options.save(option);
    return toOptionView(option);
  }

  async listOptions(organizationId: string, serviceId: string): Promise<ServiceOptionView[]> {
    const all = await this.options.listByService(organizationId, serviceId);
    return all.map(toOptionView);
  }

  private async requireService(organizationId: string, id: string): Promise<Service> {
    const service = await this.services.findById(organizationId, id);
    if (!service) {
      throw new NotFoundError('Servicio no encontrado');
    }
    return service;
  }
}

function toServiceView(service: Service): ServiceView {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    active: service.active,
  };
}

function toOptionView(option: ServiceOption): ServiceOptionView {
  return {
    id: option.id,
    serviceId: option.serviceId,
    durationMinutes: option.durationMinutes,
    price: option.price.toNumber(),
    active: option.active,
  };
}
