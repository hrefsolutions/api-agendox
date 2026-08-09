import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { CLOCK, type Clock } from '@shared/application';
import { NotFoundError } from '@shared/errors';

import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';

import {
  ADMIN_READ_REPOSITORY,
  type AdminMetrics,
  type AdminOrgDetail,
  type AdminOrgListItem,
  type AdminReadRepository,
  type OrganizationFilter,
} from './ports/admin-read.repository';

const LIST_LIMIT = 200;

/**
 * Platform operations for the super admin: cross-tenant reads and controlled
 * tenant status changes. Every mutation is audit-logged with the acting admin.
 */
@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(ADMIN_READ_REPOSITORY) private readonly read: AdminReadRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  listOrganizations(filter: OrganizationFilter): Promise<AdminOrgListItem[]> {
    return this.read.listOrganizations(filter, LIST_LIMIT);
  }

  async getOrganizationDetail(id: string): Promise<AdminOrgDetail> {
    const detail = await this.read.getOrganizationDetail(id);
    if (!detail) throw new NotFoundError('Organización no encontrada');
    return detail;
  }

  getMetrics(): Promise<AdminMetrics> {
    return this.read.getMetrics(this.clock.now());
  }

  async suspendOrganization(id: string, actingSuperAdminId: string): Promise<AdminOrgDetail> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    org.suspend(this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'suspend', id);
    return this.getOrganizationDetail(id);
  }

  async reactivateOrganization(id: string, actingSuperAdminId: string): Promise<AdminOrgDetail> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    org.reactivate(this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'reactivate', id);
    return this.getOrganizationDetail(id);
  }

  private audit(superAdminId: string, action: string, organizationId: string): void {
    this.logger.log({ superAdminId, action, organizationId }, `[super-admin] ${action}`);
  }
}
