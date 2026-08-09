import type { ServiceOption } from '../entities/service-option.entity';

export interface ServiceOptionRepository {
  findById(organizationId: string, id: string): Promise<ServiceOption | null>;
  listByService(organizationId: string, serviceId: string): Promise<ServiceOption[]>;
  countActiveByService(organizationId: string, serviceId: string): Promise<number>;
  save(option: ServiceOption): Promise<void>;
}

export const SERVICE_OPTION_REPOSITORY = Symbol('SERVICE_OPTION_REPOSITORY');
