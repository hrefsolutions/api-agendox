import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { Role } from '@shared/domain';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';

import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@modules/authentication/domain/services/password-hasher';

import { User } from '../domain/entities/user.entity';
import { UserStatus } from '../domain/user-status.enum';
import { USER_REPOSITORY, type UserRepository } from '../domain/repositories/user.repository';

export interface UserView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: UserStatus;
}

/** Create returns the one-time temporary password so the admin can hand it over. */
export interface CreatedUserView {
  user: UserView;
  temporaryPassword: string;
}

/**
 * Team / staff management (MS1). Owns staff accounts within a tenant. Alta is
 * direct with a generated temporary password (returned once). The Owner account
 * is protected: it can neither be demoted nor deactivated here, and no new Owner
 * can be minted (the single Owner is created at organization registration).
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(organizationId: string, input: CreateUserInput): Promise<CreatedUserView> {
    if (input.role === Role.Owner) {
      throw new ValidationError('No se puede crear un usuario con el rol Owner');
    }
    // Staff email is unique platform-wide (MVP identity model).
    if (await this.users.existsByEmail(input.email)) {
      throw new ConflictError('Ya existe un usuario con este email');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(temporaryPassword);
    const user = User.create({
      organizationId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      now: this.clock.now(),
    });
    await this.users.save(user);
    return { user: toView(user), temporaryPassword };
  }

  async list(organizationId: string): Promise<UserView[]> {
    const all = await this.users.listByOrganization(organizationId);
    return all.map(toView);
  }

  async get(organizationId: string, id: string): Promise<UserView> {
    const user = await this.users.findById(organizationId, id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return toView(user);
  }

  async update(organizationId: string, id: string, input: UpdateUserInput): Promise<UserView> {
    const user = await this.users.findById(organizationId, id);
    if (!user) throw new NotFoundError('Usuario no encontrado');

    if (input.role === Role.Owner) {
      throw new ValidationError('No se puede asignar el rol Owner');
    }
    if (user.role === Role.Owner) {
      // `input.role` ya no puede ser Owner (lo cortó el guard de arriba), así que
      // cualquier rol provisto sobre el Owner es una degradación.
      const demoting = input.role !== undefined;
      const deactivating = input.status === UserStatus.Inactive;
      if (demoting || deactivating) {
        throw new ConflictError('No se puede modificar el rol ni desactivar al Owner');
      }
    }

    const now = this.clock.now();
    if (input.firstName !== undefined || input.lastName !== undefined) {
      user.rename(input.firstName, input.lastName, now);
    }
    if (input.role !== undefined) {
      user.assignRole(input.role, now);
    }
    if (input.status === UserStatus.Inactive) {
      user.deactivate(now);
    } else if (input.status === UserStatus.Active) {
      user.reactivate(now);
    }
    await this.users.save(user);
    return toView(user);
  }

  /** Issues a fresh temporary password for a user and returns it once. */
  async resetPassword(organizationId: string, id: string): Promise<{ temporaryPassword: string }> {
    const user = await this.users.findById(organizationId, id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    const temporaryPassword = generateTemporaryPassword();
    user.resetPassword(await this.hasher.hash(temporaryPassword), this.clock.now());
    await this.users.save(user);
    return { temporaryPassword };
  }
}

/** URL-safe temporary password (12 chars, ≥ the 8-char registration minimum). */
function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}

function toView(user: User): UserView {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
