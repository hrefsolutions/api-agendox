import { randomUUID } from 'node:crypto';

import { Entity } from '@shared/domain';

interface SuperAdminProps {
  email: string;
  passwordHash: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Platform operator (not tenant-scoped). Authenticates through a separate flow
 * and secret from staff/customers. Bootstrapped from env via a seed; there is
 * no self-service creation.
 */
export class SuperAdmin extends Entity {
  private constructor(
    id: string,
    private props: SuperAdminProps,
  ) {
    super(id);
  }

  static create(input: { email: string; passwordHash: string; now: Date }): SuperAdmin {
    return new SuperAdmin(randomUUID(), {
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      lastLoginAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromPersistence(id: string, props: SuperAdminProps): SuperAdmin {
    return new SuperAdmin(id, props);
  }

  changePassword(passwordHash: string, now: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = now;
  }

  recordLogin(now: Date): void {
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
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
