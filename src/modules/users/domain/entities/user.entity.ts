import { randomUUID } from 'node:crypto';

import { AggregateRoot, Role } from '@shared/domain';

import { UserStatus } from '../user-status.enum';

interface UserProps {
  organizationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal user of a tenant (Owner/Admin/Receptionist/Resource Operator).
 * Staff email is unique platform-wide (MVP identity model), which lets login
 * resolve the user without a prior tenant hint (see docs/04-multi-tenancy.md).
 */
export class User extends AggregateRoot {
  private constructor(
    id: string,
    private props: UserProps,
  ) {
    super(id);
  }

  static create(input: {
    organizationId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: Role;
    now: Date;
  }): User {
    return new User(randomUUID(), {
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      status: UserStatus.Active,
      lastLoginAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: UserProps): User {
    return new User(id, props);
  }

  recordLogin(now: Date): void {
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  /** Updates the display name. Empty parts are ignored. */
  rename(firstName: string | undefined, lastName: string | undefined, now: Date): void {
    if (firstName !== undefined && firstName.trim() !== '') {
      this.props.firstName = firstName.trim();
    }
    if (lastName !== undefined && lastName.trim() !== '') {
      this.props.lastName = lastName.trim();
    }
    this.props.updatedAt = now;
  }

  /**
   * Cambia el email de login. La unicidad global es del repositorio, no de la
   * entidad: acá solo se normaliza igual que en `create`.
   */
  changeEmail(email: string, now: Date): void {
    this.props.email = email.trim().toLowerCase();
    this.props.updatedAt = now;
  }

  assignRole(role: Role, now: Date): void {
    this.props.role = role;
    this.props.updatedAt = now;
  }

  deactivate(now: Date): void {
    this.props.status = UserStatus.Inactive;
    this.props.updatedAt = now;
  }

  reactivate(now: Date): void {
    this.props.status = UserStatus.Active;
    this.props.updatedAt = now;
  }

  /** Replaces the password hash (e.g. admin-issued temporary password). */
  resetPassword(passwordHash: string, now: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = now;
  }

  get isActive(): boolean {
    return this.props.status === UserStatus.Active;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get firstName(): string {
    return this.props.firstName;
  }
  get lastName(): string {
    return this.props.lastName;
  }
  get role(): Role {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
