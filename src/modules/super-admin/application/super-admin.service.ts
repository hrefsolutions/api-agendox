import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

import type { AppConfig } from '@config/configuration';
import { CLOCK, UNIT_OF_WORK, type Clock, type UnitOfWork } from '@shared/application';
import { Role } from '@shared/domain';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';

import { TermsService } from '@modules/legal/application/terms.service';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '@modules/notifications/application/ports/email-sender.port';
import type { TermsStatus } from '@modules/legal/domain/terms';
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
  UsersService,
  type CreatedUserView,
  type UserView,
} from '@modules/users/application/users.service';
import type { UserStatus } from '@modules/users/domain/user-status.enum';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

import { OrganizationStatus } from '@modules/organizations/domain/organization-status.enum';

import {
  ADMIN_READ_REPOSITORY,
  type AdminMetrics,
  type AdminOrgDetail,
  type AdminOrgListItem,
  type AdminReadRepository,
  type OrganizationFilter,
} from './ports/admin-read.repository';
import {
  ORGANIZATION_PURGE_REPOSITORY,
  type OrganizationPurgeRepository,
} from './ports/organization-purge.repository';

const LIST_LIMIT = 200;

/** Detalle de organización más los flags de funcionalidad que gobierna la plataforma. */
export interface AdminOrgDetailWithFeatures extends AdminOrgDetail {
  features: OrganizationFeatures;
  /**
   * Aceptación de los Términos y Condiciones, con el email de quien aceptó
   * resuelto: el `userId` suelto no le sirve a nadie mirando el panel.
   */
  terms: TermsStatus & { acceptedByEmail: string | null };
}

/** Alta de un negocio, con la elección comercial con la que arranca. */
export interface CreateOrganizationCommand extends RegisterOrganizationCommand {
  /** `TRIAL` (default) o `ACTIVE` para otorgar la suscripción sin cobrar. */
  billing?: 'TRIAL' | 'ACTIVE';
  /** Plan a otorgar. Obligatorio con `billing=ACTIVE`. */
  planId?: string;
  /**
   * Mail de bienvenida al dueño con el link al panel. Por defecto se manda; se
   * apaga para cuentas internas, de demo o de QA, donde el email puede no ser
   * de una persona real.
   */
  sendWelcomeEmail?: boolean;
}

export interface CreateOrganizationResult extends RegisterOrganizationResult {
  /** Presente solo si se otorgó una suscripción activa en el alta. */
  subscription?: GrantedSubscriptionView;
  /**
   * Qué pasó con el mail de bienvenida. `skipped` cuando no se pidió; `false`
   * cuando se pidió y el envío falló — el negocio igual quedó creado, así que el
   * panel tiene que poder avisar que hay que pasarle el link a mano.
   */
  welcomeEmail: 'sent' | 'failed' | 'skipped';
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
  private readonly dashboardUrl: string;

  constructor(
    @Inject(ADMIN_READ_REPOSITORY) private readonly read: AdminReadRepository,
    @Inject(ORGANIZATION_PURGE_REPOSITORY) private readonly purgeRepository: OrganizationPurgeRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly staff: UsersService,
    private readonly registerOrganization: RegisterOrganization,
    private readonly grantSubscription: GrantSubscription,
    private readonly features: OrganizationFeaturesService,
    private readonly terms: TermsService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly logger: Logger,
    configService: ConfigService,
  ) {
    this.dashboardUrl = configService.getOrThrow<AppConfig>('app').dashboardUrl;
  }

  listOrganizations(filter: OrganizationFilter): Promise<AdminOrgListItem[]> {
    return this.read.listOrganizations(filter, LIST_LIMIT);
  }

  async getOrganizationDetail(id: string): Promise<AdminOrgDetailWithFeatures> {
    const [detail, features, terms] = await Promise.all([
      this.read.getOrganizationDetail(id),
      this.features.get(id),
      this.terms.getStatus(id),
    ]);
    if (!detail) throw new NotFoundError('Organización no encontrada');
    // El usuario que aceptó puede haber sido dado de baja después; en ese caso
    // el email queda en null y la fecha de aceptación sigue siendo válida.
    const acceptedBy = terms.acceptedByUserId
      ? await this.users.findById(id, terms.acceptedByUserId)
      : null;
    return {
      ...detail,
      features,
      terms: { ...terms, acceptedByEmail: acceptedBy?.email ?? null },
    };
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
    const { billing = 'TRIAL', planId, sendWelcomeEmail = true, ...registration } = command;
    if (billing === 'ACTIVE' && !planId) {
      throw new ValidationError('Para activar la suscripción hay que elegir un plan');
    }

    const registered = await this.registerOrganization.execute(registration);
    this.audit(actingSuperAdminId, 'create', registered.organizationId);

    const welcomeEmail = sendWelcomeEmail
      ? await this.sendWelcomeEmail(registration, registered.organizationId)
      : 'skipped';
    const result: CreateOrganizationResult = { ...registered, welcomeEmail };

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
   * Mail de bienvenida al dueño con el link al panel.
   *
   * Nunca tira: el negocio ya quedó creado y con su usuario, así que un SMTP
   * caído no puede convertir un alta exitosa en un 500 (el operador reintentaría
   * el alta y se comería un "slug ya en uso"). El fallo se devuelve como estado
   * para que el panel avise que hay que pasarle el link a mano.
   *
   * La contraseña **no** viaja en el mail: la eligió el operador en el alta y es
   * él quien se la comunica al dueño por el canal que ya usa.
   */
  private async sendWelcomeEmail(
    registration: RegisterOrganizationCommand,
    organizationId: string,
  ): Promise<'sent' | 'failed'> {
    try {
      await this.email.send({
        to: registration.owner.email,
        subject: `Bienvenido a Agendox — ${registration.organizationName}`,
        template: 'organization-welcome',
        vars: {
          orgName: registration.organizationName,
          ownerName: registration.owner.firstName,
          ownerEmail: registration.owner.email,
          loginUrl: `${this.dashboardUrl}/login`,
        },
      });
      return 'sent';
    } catch (error) {
      this.logger.error(
        { organizationId, err: error },
        '[super-admin] welcome-email failed',
      );
      return 'failed';
    }
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

  /**
   * Staff del negocio. El alta y la baja de recepcionistas vive en la plataforma
   * y no en el panel del negocio (decisión de producto): el dueño ve su equipo
   * pero no lo administra.
   */
  async listUsers(organizationId: string): Promise<UserView[]> {
    await this.requireOrganization(organizationId);
    return this.staff.list(organizationId);
  }

  /**
   * Alta de recepcionista. El rol se fija acá y **no** llega por el body: así la
   * API de plataforma no puede fabricar un Owner ni un Admin aunque alguien
   * manipule el request. La contraseña temporal se devuelve una sola vez.
   */
  async createReceptionist(
    organizationId: string,
    input: { firstName: string; lastName: string; email: string },
    actingSuperAdminId: string,
  ): Promise<CreatedUserView> {
    await this.requireOrganization(organizationId);
    const created = await this.staff.create(organizationId, {
      ...input,
      role: Role.Receptionist,
    });
    this.audit(actingSuperAdminId, 'create-user', organizationId);
    return created;
  }

  async updateUser(
    organizationId: string,
    userId: string,
    changes: { firstName?: string; lastName?: string; status?: UserStatus },
    actingSuperAdminId: string,
  ): Promise<UserView> {
    await this.requireOrganization(organizationId);
    // `role` no se propaga a propósito: el único rol que esta vía crea es
    // Receptionist, y cambiarlo desde acá sería una escalada silenciosa.
    const updated = await this.staff.update(organizationId, userId, changes);
    this.audit(actingSuperAdminId, 'update-user', organizationId);
    return updated;
  }

  async resetUserPassword(
    organizationId: string,
    userId: string,
    actingSuperAdminId: string,
  ): Promise<{ temporaryPassword: string }> {
    await this.requireOrganization(organizationId);
    const result = await this.staff.resetPassword(organizationId, userId);
    this.audit(actingSuperAdminId, 'reset-user-password', organizationId);
    return result;
  }

  private async requireOrganization(id: string): Promise<void> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
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

  /**
   * Borrado definitivo: saca la organización y todas sus filas de la base.
   *
   * Sólo sobre organizaciones ya dadas de baja. Son dos pasos a propósito: la
   * baja lógica es lo que se hace todos los días y se puede revertir; esto es
   * irreversible y no tiene undo, así que exige que alguien ya haya decidido
   * antes que ese negocio no va más.
   *
   * Existe porque el email del staff y el slug son únicos en toda la plataforma:
   * mientras las filas de una cuenta muerta sigan ahí, ese email y ese slug
   * quedan bloqueados para siempre — que es exactamente lo que pasa cuando un
   * alta sale mal (email con typo, negocio de prueba) y hay que rehacerla.
   */
  async deleteOrganization(
    id: string,
    actingSuperAdminId: string,
  ): Promise<{ id: string; name: string; deletedRows: number }> {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError('Organización no encontrada');
    if (org.status !== OrganizationStatus.Disabled) {
      throw new ConflictError(
        'Sólo se puede eliminar definitivamente una organización dada de baja. Dala de baja primero.',
      );
    }

    const name = org.name;
    const slug = org.slug;
    // Transacción única: un borrado a medias dejaría filas huérfanas que ya no
    // se pueden encontrar desde ningún lado, porque la organización no está.
    const report = await this.uow.run(() => this.purgeRepository.purge(id));

    // El log es lo único que queda de esta organización: va con el detalle por
    // tabla, no sólo el total.
    this.logger.warn(
      {
        superAdminId: actingSuperAdminId,
        action: 'delete',
        organizationId: id,
        name,
        slug,
        deletedRows: report.total,
        byTable: report.byTable,
      },
      '[super-admin] delete',
    );

    return { id, name, deletedRows: report.total };
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
