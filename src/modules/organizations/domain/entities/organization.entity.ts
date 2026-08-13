import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@shared/domain';

import { OrganizationStatus } from '../organization-status.enum';
import { OrganizationCreated } from '../events/organization-created.event';
import type { Slug } from '../value-objects/slug.vo';

interface OrganizationProps {
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A tenant. All operational data belongs to exactly one Organization. */
export class Organization extends AggregateRoot {
  private constructor(
    id: string,
    private props: OrganizationProps,
  ) {
    super(id);
  }

  /** Registers a new organization in the initial TRIAL state. */
  static create(input: { name: string; slug: Slug; timezone: string; now: Date }): Organization {
    const org = new Organization(randomUUID(), {
      name: input.name.trim(),
      slug: input.slug.value,
      status: OrganizationStatus.Trial,
      timezone: input.timezone,
      createdAt: input.now,
      updatedAt: input.now,
    });
    org.addEvent(new OrganizationCreated(org.id, org.props.slug, org.props.name, input.now));
    return org;
  }

  static fromPersistence(id: string, props: OrganizationProps): Organization {
    return new Organization(id, props);
  }

  /** Super-admin action: blocks the tenant from operating. */
  suspend(now: Date): void {
    this.props.status = OrganizationStatus.Suspended;
    this.props.updatedAt = now;
  }

  /** Super-admin action: restores a suspended tenant to operation. */
  reactivate(now: Date): void {
    this.props.status = OrganizationStatus.Active;
    this.props.updatedAt = now;
  }

  /**
   * Super-admin action: baja definitiva del negocio.
   *
   * Es una baja lógica, no un borrado de filas: los turnos, los clientes y la
   * facturación siguen existiendo (hacen falta para historia y para cualquier
   * reclamo posterior), pero la organización deja de ser operativa y nadie
   * puede volver a entrar. Se revierte con {@link reactivate}.
   *
   * El borrado físico existe aparte, como segundo paso explícito y sólo sobre
   * organizaciones ya dadas de baja (ver `SuperAdminService.deleteOrganization`).
   */
  disable(now: Date): void {
    this.props.status = OrganizationStatus.Disabled;
    this.props.updatedAt = now;
  }

  /** Super-admin action: corrige el nombre o la zona horaria del negocio. */
  updateProfile(input: { name?: string; timezone?: string }, now: Date): void {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length > 0) this.props.name = name;
    }
    if (input.timezone !== undefined) this.props.timezone = input.timezone;
    this.props.updatedAt = now;
  }

  /** Whether the organization can operate (not suspended/disabled). */
  get isOperational(): boolean {
    return (
      this.props.status === OrganizationStatus.Trial ||
      this.props.status === OrganizationStatus.Active
    );
  }

  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get status(): OrganizationStatus {
    return this.props.status;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
