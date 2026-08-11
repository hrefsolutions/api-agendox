import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { CLOCK, type Clock } from '@shared/application';
import { NotFoundError, ValidationError } from '@shared/errors';

import { OrganizationFeaturesService } from '@modules/organizations/application/organization-features.service';
import { RegisterOrganization } from '@modules/organizations/application/use-cases/register-organization.use-case';
import type {
  RegisterOrganizationCommand,
  RegisterOrganizationResult,
} from '@modules/organizations/application/dtos/register-organization.dto';
import type { OrganizationFeatures } from '@modules/organizations/domain/organization-features';
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

/** Detalle de organización más los flags de funcionalidad que gobierna la plataforma. */
export interface AdminOrgDetailWithFeatures extends AdminOrgDetail {
  features: OrganizationFeatures;
}

/**
 * Platform operations for the super admin: cross-tenant reads and controlled
 * tenant status changes. Every mutation is audit-logged with the acting admin.
 *
 * El alta, la edición y la baja de organizaciones viven acá y en ningún otro
 * lado: el negocio no se puede dar de alta a sí mismo.
 */
@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(ADMIN_READ_REPOSITORY) private readonly read: AdminReadRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    private readonly registerOrganization: RegisterOrganization,
    private readonly features: OrganizationFeaturesService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  listOrganizations(filter: OrganizationFilter): Promise<AdminOrgListItem[]> {
    return this.read.listOrganizations(filter, LIST_LIMIT);
  }

  async getOrganizationDetail(id: string): Promise<AdminOrgDetailWithFeatures> {
    const [detail, features] = await Promise.all([
      this.read.getOrganizationDetail(id),
      this.features.get(id),
    ]);
    if (!detail) throw new NotFoundError('Organización no encontrada');
    return { ...detail, features };
  }

  getMetrics(): Promise<AdminMetrics> {
    return this.read.getMetrics(this.clock.now());
  }

  async createOrganization(
    command: RegisterOrganizationCommand,
    actingSuperAdminId: string,
  ): Promise<RegisterOrganizationResult> {
    const result = await this.registerOrganization.execute(command);
    this.audit(actingSuperAdminId, 'create', result.organizationId);
    return result;
  }

  async updateOrganization(
    id: string,
    changes: { name?: string; timezone?: string },
    actingSuperAdminId: string,
  ): Promise<AdminOrgDetailWithFeatures> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    if (changes.timezone !== undefined && !isValidTimeZone(changes.timezone)) {
      throw new ValidationError('Zona horaria IANA inválida', { timezone: changes.timezone });
    }
    org.updateProfile(changes, this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'update', id);
    return this.getOrganizationDetail(id);
  }

  async suspendOrganization(
    id: string,
    actingSuperAdminId: string,
  ): Promise<AdminOrgDetailWithFeatures> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    org.suspend(this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'suspend', id);
    return this.getOrganizationDetail(id);
  }

  async reactivateOrganization(
    id: string,
    actingSuperAdminId: string,
  ): Promise<AdminOrgDetailWithFeatures> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    org.reactivate(this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'reactivate', id);
    return this.getOrganizationDetail(id);
  }

  /**
   * Baja del negocio. Es lógica (pasa a `DISABLED`), no un borrado de filas:
   * ver {@link Organization.disable} para el porqué.
   */
  async disableOrganization(
    id: string,
    actingSuperAdminId: string,
  ): Promise<AdminOrgDetailWithFeatures> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    org.disable(this.clock.now());
    await this.organizations.save(org);
    this.audit(actingSuperAdminId, 'disable', id);
    return this.getOrganizationDetail(id);
  }

  async updateFeatures(
    id: string,
    changes: Partial<OrganizationFeatures>,
    actingSuperAdminId: string,
  ): Promise<OrganizationFeatures> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    const updated = await this.features.update(id, changes);
    this.audit(actingSuperAdminId, 'update-features', id);
    return updated;
  }

  private audit(superAdminId: string, action: string, organizationId: string): void {
    this.logger.log({ superAdminId, action, organizationId }, `[super-admin] ${action}`);
  }
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
