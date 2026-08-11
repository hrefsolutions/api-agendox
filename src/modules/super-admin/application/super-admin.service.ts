import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import { CLOCK, type Clock } from '@shared/application';
import { Role } from '@shared/domain';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';

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
  GrantSubscription,
  type GrantedSubscriptionView,
} from '@modules/subscriptions/application/grant-subscription.use-case';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

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

/** Alta de un negocio, con la elección comercial con la que arranca. */
export interface CreateOrganizationCommand extends RegisterOrganizationCommand {
  /** `TRIAL` (default) o `ACTIVE` para otorgar la suscripción sin cobrar. */
  billing?: 'TRIAL' | 'ACTIVE';
  /** Plan a otorgar. Obligatorio con `billing=ACTIVE`. */
  planId?: string;
}

export interface CreateOrganizationResult extends RegisterOrganizationResult {
  /** Presente solo si se otorgó una suscripción activa en el alta. */
  subscription?: GrantedSubscriptionView;
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
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly registerOrganization: RegisterOrganization,
    private readonly grantSubscription: GrantSubscription,
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

  /**
   * Alta de un negocio. Con `billing=ACTIVE` además le otorga la suscripción
   * activa sin pasar por la pasarela; el trial se crea igual (es parte de la
   * transacción del alta) y queda irrelevante, porque una suscripción activa ya
   * habilita la operación por sí sola.
   */
  async createOrganization(
    command: CreateOrganizationCommand,
    actingSuperAdminId: string,
  ): Promise<CreateOrganizationResult> {
    const { billing = 'TRIAL', planId, ...registration } = command;
    if (billing === 'ACTIVE' && !planId) {
      throw new ValidationError('Para activar la suscripción hay que elegir un plan');
    }

    const result = await this.registerOrganization.execute(registration);
    this.audit(actingSuperAdminId, 'create', result.organizationId);

    if (billing !== 'ACTIVE' || !planId) return result;

    const granted = await this.grantSubscription.execute(result.organizationId, planId);
    // Se audita aparte porque es lo que da acceso pago sin cobro: tiene que
    // quedar en el log quién lo hizo y con qué plan.
    this.logger.log(
      {
        superAdminId: actingSuperAdminId,
        action: 'grant-subscription',
        organizationId: result.organizationId,
        planId: granted.planId,
        planName: granted.planName,
        currentPeriodEnd: granted.currentPeriodEnd,
      },
      '[super-admin] grant-subscription',
    );
    return { ...result, subscription: granted };
  }

  /**
   * Cambia el email del usuario dueño. Existe porque el email del dueño no es
   * solo credencial: es el `payer_email` que recibe la pasarela al suscribir, así
   * que una cuenta creada con un email de prueba necesita poder corregirse sin
   * recrear el negocio.
   */
  async updateOwnerEmail(
    organizationId: string,
    email: string,
    actingSuperAdminId: string,
  ): Promise<{ ownerEmail: string }> {
    const org = await this.organizations.findById(organizationId);
    if (!org) throw new NotFoundError('Organización no encontrada');

    const owners = await this.users.listActiveByOrganization(organizationId);
    const owner = owners.find((user) => user.role === Role.Owner);
    if (!owner) throw new NotFoundError('La organización no tiene un usuario dueño activo');

    const normalized = email.trim().toLowerCase();
    if (normalized === owner.email) return { ownerEmail: owner.email };
    // El email de staff es único global (ver ADR 0001), así que hay que chequear
    // contra toda la plataforma y no solo contra esta organización.
    if (await this.users.existsByEmail(normalized)) {
      throw new ConflictError('El email ya está registrado');
    }

    owner.changeEmail(normalized, this.clock.now());
    await this.users.save(owner);
    this.audit(actingSuperAdminId, 'update-owner-email', organizationId);
    return { ownerEmail: normalized };
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
