import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { NotFoundError } from '@shared/errors';
import { parseIsoDate, zonedTimeToUtcMs } from '@shared/domain/temporal/time-zone';

import { SettingsService } from '@modules/settings/application/settings.service';
import {
  SERVICE_OPTION_REPOSITORY,
  type ServiceOptionRepository,
} from '@modules/services/domain/repositories/service-option.repository';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '@modules/services/domain/repositories/service.repository';
import {
  BLOCKED_TIME_REPOSITORY,
  RESOURCE_REPOSITORY,
  RESOURCE_SCHEDULE_REPOSITORY,
  RESOURCE_SERVICE_REPOSITORY,
  type BlockedTimeRepository,
  type ResourceRepository,
  type ResourceScheduleRepository,
  type ResourceServiceRepository,
} from '@modules/resources/domain/repositories';

import { AvailabilityCalculator, type BusyInterval } from '../domain/availability-calculator';
import { APPOINTMENT_BUSY_PROVIDER, type AppointmentBusyProvider } from './appointment-busy.port';
import type {
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilitySlotView,
} from './availability.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes bookable slots for (service, service option, resource | any, date
 * range). Gathers configuration and busy data through tenant-scoped
 * repositories and delegates the math to the pure {@link AvailabilityCalculator}.
 */
@Injectable()
export class CalculateAvailability {
  private readonly calculator = new AvailabilityCalculator();

  constructor(
    private readonly settings: SettingsService,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_OPTION_REPOSITORY) private readonly serviceOptions: ServiceOptionRepository,
    @Inject(RESOURCE_REPOSITORY) private readonly resources: ResourceRepository,
    @Inject(RESOURCE_SCHEDULE_REPOSITORY) private readonly schedules: ResourceScheduleRepository,
    @Inject(BLOCKED_TIME_REPOSITORY) private readonly blocks: BlockedTimeRepository,
    @Inject(RESOURCE_SERVICE_REPOSITORY) private readonly links: ResourceServiceRepository,
    @Inject(APPOINTMENT_BUSY_PROVIDER) private readonly appointmentBusy: AppointmentBusyProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(organizationId: string, query: AvailabilityQuery): Promise<AvailabilityResult> {
    if (!(await this.services.existsActive(organizationId, query.serviceId))) {
      throw new NotFoundError('Servicio no encontrado o inactivo');
    }
    const option = await this.serviceOptions.findById(organizationId, query.serviceOptionId);
    if (!option || !option.active || option.serviceId !== query.serviceId) {
      throw new NotFoundError('Opción de servicio no encontrada para este servicio');
    }

    const candidateIds = await this.resolveCandidateResources(organizationId, query);

    const business = await this.settings.getBusiness(organizationId);
    const booking = await this.settings.getBooking(organizationId);
    const businessHours = await this.settings.getBusinessHours(organizationId);
    const timeZone = business.timezone;

    const from = parseIsoDate(query.fromDate);
    const to = parseIsoDate(query.toDate);
    const fromMs = zonedTimeToUtcMs(from, 0, 0, timeZone);
    const toMs = zonedTimeToUtcMs(to, 0, 0, timeZone) + MS_PER_DAY;

    const [blockList, appointmentBusyIntervals] = await Promise.all([
      this.blocks.list(organizationId),
      this.appointmentBusy.findBusyIntervals(organizationId, candidateIds, fromMs, toMs),
    ]);

    const nowMs = this.clock.now().getTime();
    const slots: AvailabilitySlotView[] = [];

    for (const resourceId of candidateIds) {
      const resourceSchedules = await this.schedules.getByResource(organizationId, resourceId);
      const busy: BusyInterval[] = [
        ...blockList
          .filter(
            (block) =>
              (block.resourceId === null || block.resourceId === resourceId) &&
              block.startsAt.getTime() < toMs &&
              block.endsAt.getTime() > fromMs,
          )
          .map((block) => ({ startMs: block.startsAt.getTime(), endMs: block.endsAt.getTime() })),
        ...appointmentBusyIntervals
          .filter((interval) => interval.resourceId === resourceId)
          .map((interval) => ({ startMs: interval.startMs, endMs: interval.endMs })),
      ];

      const computed = this.calculator.compute({
        timeZone,
        fromDate: query.fromDate,
        toDate: query.toDate,
        durationMinutes: option.durationMinutes,
        granularityMinutes: booking.slotGranularityMinutes,
        minNoticeMinutes: booking.minNoticeMinutes,
        maxAdvanceDays: booking.maxAdvanceDays,
        nowMs,
        businessHours,
        resourceSchedules,
        busy,
      });

      for (const slot of computed) {
        slots.push({
          date: slot.date,
          start: new Date(slot.startMs).toISOString(),
          end: new Date(slot.endMs).toISOString(),
          resourceId,
        });
      }
    }

    slots.sort(
      (a, b) => a.start.localeCompare(b.start) || a.resourceId.localeCompare(b.resourceId),
    );
    return { timeZone, durationMinutes: option.durationMinutes, slots };
  }

  private async resolveCandidateResources(
    organizationId: string,
    query: AvailabilityQuery,
  ): Promise<string[]> {
    if (query.resourceId) {
      const [active, linked] = await Promise.all([
        this.resources.existsActive(organizationId, query.resourceId),
        this.links.exists(organizationId, query.resourceId, query.serviceId),
      ]);
      if (!active || !linked) {
        throw new NotFoundError('El recurso no está disponible para este servicio');
      }
      return [query.resourceId];
    }

    const ids = await this.links.listResourceIds(organizationId, query.serviceId);
    const activeFlags = await Promise.all(
      ids.map((id) => this.resources.existsActive(organizationId, id)),
    );
    return ids.filter((_id, index) => activeFlags[index]);
  }
}
