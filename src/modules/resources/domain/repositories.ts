import type { Resource } from './entities/resource.entity';
import type { BlockedTime, ResourceScheduleEntry } from './types';

export interface ResourceRepository {
  findById(organizationId: string, id: string): Promise<Resource | null>;
  existsActive(organizationId: string, id: string): Promise<boolean>;
  /**
   * Locks the active resource row `FOR UPDATE` (must run inside a transaction)
   * and returns whether it exists. Serializes concurrent appointment creation
   * for the same resource.
   */
  lockActive(organizationId: string, id: string): Promise<boolean>;
  list(organizationId: string): Promise<Resource[]>;
  save(resource: Resource): Promise<void>;
}
export const RESOURCE_REPOSITORY = Symbol('RESOURCE_REPOSITORY');

export interface ResourceScheduleRepository {
  getByResource(organizationId: string, resourceId: string): Promise<ResourceScheduleEntry[]>;
  replaceForResource(
    organizationId: string,
    resourceId: string,
    entries: ResourceScheduleEntry[],
  ): Promise<void>;
}
export const RESOURCE_SCHEDULE_REPOSITORY = Symbol('RESOURCE_SCHEDULE_REPOSITORY');

export interface BlockedTimeRepository {
  save(organizationId: string, blockedTime: BlockedTime): Promise<void>;
  findById(organizationId: string, id: string): Promise<BlockedTime | null>;
  list(organizationId: string): Promise<BlockedTime[]>;
  delete(organizationId: string, id: string): Promise<void>;
}
export const BLOCKED_TIME_REPOSITORY = Symbol('BLOCKED_TIME_REPOSITORY');

export interface ResourceServiceRepository {
  exists(organizationId: string, resourceId: string, serviceId: string): Promise<boolean>;
  assign(organizationId: string, resourceId: string, serviceId: string): Promise<void>;
  remove(organizationId: string, resourceId: string, serviceId: string): Promise<void>;
  listServiceIds(organizationId: string, resourceId: string): Promise<string[]>;
  listResourceIds(organizationId: string, serviceId: string): Promise<string[]>;
}
export const RESOURCE_SERVICE_REPOSITORY = Symbol('RESOURCE_SERVICE_REPOSITORY');
