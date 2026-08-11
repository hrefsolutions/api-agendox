import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '@shared/errors';

import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/repositories/organization.repository';
import { OrganizationFeaturesService } from '../organization-features.service';
import type { OrganizationView } from '../dtos/register-organization.dto';

/** Returns the authenticated user's organization (tenant-scoped read). */
@Injectable()
export class GetCurrentOrganization {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    private readonly features: OrganizationFeaturesService,
  ) {}

  async execute(organizationId: string): Promise<OrganizationView> {
    const [organization, features] = await Promise.all([
      this.organizations.findById(organizationId),
      this.features.get(organizationId),
    ]);
    if (!organization) {
      throw new NotFoundError('Organización no encontrada');
    }
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.createdAt,
      features,
    };
  }
}
