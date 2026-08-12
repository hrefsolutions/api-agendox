import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, UNIT_OF_WORK, type Clock, type UnitOfWork } from '@shared/application';
import { UnauthorizedError, ValidationError } from '@shared/errors';

import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';

import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/services/password-hasher';

export interface ChangePasswordInput {
  organizationId: string;
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Rotación de contraseña por parte del propio usuario.
 *
 * Existe sobre todo por el alta de staff: el recepcionista lo crea el super
 * admin con una contraseña temporal que le llega por un canal informal, así que
 * sin esta vía esa contraseña sería permanente.
 *
 * Al cambiarla se **revocan todas las sesiones**: si la temporal circuló, las
 * sesiones abiertas con ella tienen que morir con el cambio.
 */
@Injectable()
export class ChangePassword {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(input.organizationId, input.userId);
    // El principal viene de un token válido, así que no encontrarlo significa
    // que la cuenta se borró o se movió de tenant: no es un caso de negocio.
    if (!user) throw new UnauthorizedError('Sesión inválida');

    if (!(await this.hasher.verify(user.passwordHash, input.currentPassword))) {
      throw new UnauthorizedError('La contraseña actual no es correcta');
    }
    if (input.currentPassword === input.newPassword) {
      throw new ValidationError('La contraseña nueva tiene que ser distinta de la actual');
    }

    const now = this.clock.now();
    const passwordHash = await this.hasher.hash(input.newPassword);

    await this.uow.run(async () => {
      user.resetPassword(passwordHash, now);
      await this.users.save(user);
      await this.refreshTokens.revokeAllForUser(user.id, now);
    });
  }
}
