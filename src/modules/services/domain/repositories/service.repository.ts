import type { Service } from '../entities/service.entity';

export interface ServiceRepository {
  findById(organizationId: string, id: string): Promise<Service | null>;
  existsActive(organizationId: string, id: string): Promise<boolean>;
  list(organizationId: string): Promise<Service[]>;
  save(service: Service): Promise<void>;
}

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');
