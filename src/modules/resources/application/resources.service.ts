import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, UNIT_OF_WORK, type Clock, type UnitOfWork } from '@shared/application';
import { NotFoundError, ValidationError } from '@shared/errors';
import { parseIsoDate, parseWallTime, zonedTimeToUtcMs } from '@shared/domain/temporal/time-zone';

import { SettingsService } from '@modules/settings/application/settings.service';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '@modules/services/domain/repositories/service.repository';

import { Resource } from '../domain/entities/resource.entity';
import type { BlockedTimeType } from '../domain/blocked-time-type.enum';
import {
  BLOCKED_TIME_REPOSITORY,
  RESOURCE_REPOSITORY,
  RESOURCE_SCHEDULE_REPOSITORY,
  RESOURCE_SERVICE_REPOSITORY,
  type BlockedTimeRepository,
  type ResourceRepository,
  type ResourceScheduleRepository,
  type ResourceServiceRepository,
} from '../domain/repositories';
import type { BlockedTime, ResourceScheduleEntry } from '../domain/types';

export interface ResourceView {
  id: string;
  name: string;
  type: string;
  color: string | null;
  active: boolean;
  description: string | null;
  userId: string | null;
}

export interface ResourceDetailView extends ResourceView {
  schedule: ResourceScheduleEntry[];
  serviceIds: string[];
}

export interface BlockedTimeView {
  id: string;
  resourceId: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  type: BlockedTimeType;
  createdAt: Date;
}

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(RESOURCE_REPOSITORY) private readonly resources: ResourceRepository,
    @Inject(RESOURCE_SCHEDULE_REPOSITORY) private readonly schedules: ResourceScheduleRepository,
    @Inject(BLOCKED_TIME_REPOSITORY) private readonly blocks: BlockedTimeRepository,
    @Inject(RESOURCE_SERVICE_REPOSITORY) private readonly links: ResourceServiceRepository,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    private readonly settings: SettingsService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createResource(
    organizationId: string,
    input: {
      name: string;
      type: string;
      color?: string | null;
      description?: string | null;
      userId?: string | null;
    },
  ): Promise<ResourceView> {
    const resource = Resource.create({ organizationId, ...input, now: this.clock.now() });
    await this.resources.save(resource);
    return toResourceView(resource);
  }

  async updateResource(
    organizationId: string,
    id: string,
    patch: {
      name?: string;
      type?: string;
      color?: string | null;
      description?: string | null;
      active?: boolean;
      userId?: string | null;
    },
  ): Promise<ResourceView> {
    const resource = await this.requireResource(organizationId, id);
    resource.update(patch, this.clock.now());
    await this.resources.save(resource);
    return toResourceView(resource);
  }

  async listResources(organizationId: string): Promise<ResourceView[]> {
    const all = await this.resources.list(organizationId);
    return all.map(toResourceView);
  }

  async getResource(organizationId: string, id: string): Promise<ResourceDetailView> {
    const resource = await this.requireResource(organizationId, id);
    const [schedule, serviceIds] = await Promise.all([
      this.schedules.getByResource(organizationId, id),
      this.links.listServiceIds(organizationId, id),
    ]);
    return { ...toResourceView(resource), schedule, serviceIds };
  }

  async setSchedule(
    organizationId: string,
    resourceId: string,
    entries: ResourceScheduleEntry[],
  ): Promise<ResourceScheduleEntry[]> {
    await this.requireResource(organizationId, resourceId);
    for (const entry of entries) {
      if (entry.startsAt >= entry.endsAt) {
        throw new ValidationError('startsAt del horario debe ser anterior a endsAt', {
          dayOfWeek: entry.dayOfWeek,
        });
      }
    }
    await this.uow.run(() =>
      this.schedules.replaceForResource(organizationId, resourceId, entries),
    );
    return this.schedules.getByResource(organizationId, resourceId);
  }

  async createBlockedTime(
    organizationId: string,
    input: {
      resourceId?: string | null;
      /** Wall-clock local datetime (`YYYY-MM-DDTHH:MM`) in the org timezone. */
      startsAtLocal: string;
      endsAtLocal: string;
      reason?: string | null;
      type: BlockedTimeType;
      createdByUserId: string;
    },
  ): Promise<BlockedTimeView> {
    const { timezone } = await this.settings.getBusiness(organizationId);
    const startsAt = localDateTimeToUtc(input.startsAtLocal, timezone);
    const endsAt = localDateTimeToUtc(input.endsAtLocal, timezone);
    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new ValidationError('startsAt del bloqueo debe ser anterior a endsAt');
    }
    if (input.resourceId) {
      await this.requireResource(organizationId, input.resourceId);
    }
    const blockedTime: BlockedTime = {
      id: randomUUID(),
      resourceId: input.resourceId ?? null,
      startsAt,
      endsAt,
      reason: input.reason ?? null,
      type: input.type,
      createdByUserId: input.createdByUserId,
      createdAt: this.clock.now(),
    };
    await this.blocks.save(organizationId, blockedTime);
    return toBlockedTimeView(blockedTime);
  }

  async listBlockedTimes(organizationId: string): Promise<BlockedTimeView[]> {
    const all = await this.blocks.list(organizationId);
    return all.map(toBlockedTimeView);
  }

  async deleteBlockedTime(organizationId: string, id: string): Promise<void> {
    const existing = await this.blocks.findById(organizationId, id);
    if (!existing) {
      throw new NotFoundError('Bloqueo no encontrado');
    }
    await this.blocks.delete(organizationId, id);
  }

  async assignService(
    organizationId: string,
    resourceId: string,
    serviceId: string,
  ): Promise<void> {
    await this.requireResource(organizationId, resourceId);
    const service = await this.services.findById(organizationId, serviceId);
    if (!service) {
      throw new NotFoundError('Servicio no encontrado');
    }
    await this.links.assign(organizationId, resourceId, serviceId);
  }

  async unassignService(
    organizationId: string,
    resourceId: string,
    serviceId: string,
  ): Promise<void> {
    await this.links.remove(organizationId, resourceId, serviceId);
  }

  private async requireResource(organizationId: string, id: string): Promise<Resource> {
    const resource = await this.resources.findById(organizationId, id);
    if (!resource) {
      throw new NotFoundError('Recurso no encontrado');
    }
    return resource;
  }
}

/** Converts a `YYYY-MM-DDTHH:MM` wall-clock string in `timeZone` to a UTC instant. */
function localDateTimeToUtc(local: string, timeZone: string): Date {
  const [datePart, timePart] = local.split('T');
  const date = parseIsoDate(datePart!);
  const { hours, minutes } = parseWallTime(timePart!);
  return new Date(zonedTimeToUtcMs(date, hours, minutes, timeZone));
}

function toResourceView(resource: Resource): ResourceView {
  return {
    id: resource.id,
    name: resource.name,
    type: resource.type,
    color: resource.color,
    active: resource.active,
    description: resource.description,
    userId: resource.userId,
  };
}

function toBlockedTimeView(blockedTime: BlockedTime): BlockedTimeView {
  return {
    id: blockedTime.id,
    resourceId: blockedTime.resourceId,
    startsAt: blockedTime.startsAt,
    endsAt: blockedTime.endsAt,
    reason: blockedTime.reason,
    type: blockedTime.type,
    createdAt: blockedTime.createdAt,
  };
}
