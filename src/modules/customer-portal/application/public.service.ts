import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '@shared/errors';

import { SettingsService } from '@modules/settings/application/settings.service';
import type { Organization } from '@modules/organizations/domain/entities/organization.entity';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';
import {
  SERVICE_OPTION_REPOSITORY,
  type ServiceOptionRepository,
} from '@modules/services/domain/repositories/service-option.repository';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '@modules/services/domain/repositories/service.repository';
import {
  RESOURCE_REPOSITORY,
  RESOURCE_SERVICE_REPOSITORY,
  type ResourceRepository,
  type ResourceServiceRepository,
} from '@modules/resources/domain/repositories';
import { CalculateAvailability } from '@modules/availability/application/calculate-availability.use-case';
import type {
  AvailabilityQuery,
  AvailabilityResult,
} from '@modules/availability/application/availability.dto';

export interface PublicOrganizationView {
  name: string;
  slug: string;
  timezone: string;
  publicBookingEnabled: boolean;
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    publicTitle: string | null;
    publicDescription: string | null;
  };
}

export interface PublicServiceOptionView {
  id: string;
  /** Qué es la opción. Es lo único que le dice al cliente qué está reservando. */
  name: string;
  durationMinutes: number;
  price: number;
}

export interface PublicServiceView {
  id: string;
  name: string;
  description: string | null;
  options: PublicServiceOptionView[];
}

export interface PublicResourceView {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

@Injectable()
export class PublicService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_OPTION_REPOSITORY) private readonly serviceOptions: ServiceOptionRepository,
    @Inject(RESOURCE_REPOSITORY) private readonly resources: ResourceRepository,
    @Inject(RESOURCE_SERVICE_REPOSITORY) private readonly links: ResourceServiceRepository,
    private readonly settings: SettingsService,
    private readonly availability: CalculateAvailability,
  ) {}

  async getOrganization(slug: string): Promise<PublicOrganizationView> {
    const organization = await this.resolveOrganization(slug);
    const [branding, booking] = await Promise.all([
      this.settings.getBranding(organization.id),
      this.settings.getBooking(organization.id),
    ]);
    return {
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      publicBookingEnabled: booking.publicBookingEnabled,
      branding: {
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        publicTitle: branding.publicTitle,
        publicDescription: branding.publicDescription,
      },
    };
  }

  async listServices(slug: string): Promise<PublicServiceView[]> {
    const organization = await this.resolveOrganization(slug);
    const services = (await this.services.list(organization.id)).filter(
      (service) => service.active,
    );
    const views: PublicServiceView[] = [];
    for (const service of services) {
      const options = (await this.serviceOptions.listByService(organization.id, service.id)).filter(
        (option) => option.active,
      );
      if (options.length === 0) continue; // not bookable without an active option
      views.push({
        id: service.id,
        name: service.name,
        description: service.description,
        options: options.map((option) => ({
          id: option.id,
          name: option.name,
          durationMinutes: option.durationMinutes,
          price: option.price.toNumber(),
        })),
      });
    }
    return views;
  }

  async listResources(slug: string, serviceId: string): Promise<PublicResourceView[]> {
    const organization = await this.resolveOrganization(slug);
    const ids = await this.links.listResourceIds(organization.id, serviceId);
    const views: PublicResourceView[] = [];
    for (const id of ids) {
      const resource = await this.resources.findById(organization.id, id);
      if (resource && resource.active) {
        views.push({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          color: resource.color,
        });
      }
    }
    return views;
  }

  async getAvailability(slug: string, query: AvailabilityQuery): Promise<AvailabilityResult> {
    const organization = await this.resolveOrganization(slug);
    return this.availability.execute(organization.id, query);
  }

  private async resolveOrganization(slug: string): Promise<Organization> {
    const organization = await this.organizations.findBySlug(slug);
    if (!organization || !organization.isOperational) {
      throw new NotFoundError('Organización no disponible');
    }
    return organization;
  }
}
