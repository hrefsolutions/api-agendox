import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { UnauthorizedError } from '@shared/errors';

import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@modules/authentication/domain/services/password-hasher';

import {
  SUPER_ADMIN_REPOSITORY,
  type SuperAdminRepository,
} from '../domain/repositories/super-admin.repository';
import { SuperAdminTokenService } from '../infrastructure/super-admin-token.service';

export interface LoginSuperAdminResult {
  accessToken: string;
  expiresAt: Date;
  superAdmin: { id: string; email: string };
}

/** Authenticates a super admin and issues a platform access token. */
@Injectable()
export class LoginSuperAdmin {
  constructor(
    @Inject(SUPER_ADMIN_REPOSITORY) private readonly superAdmins: SuperAdminRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly tokens: SuperAdminTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(email: string, password: string): Promise<LoginSuperAdminResult> {
    const superAdmin = await this.superAdmins.findByEmail(email);
    // Constant-time whether or not the account exists (anti-enumeration).
    const passwordOk = superAdmin
      ? await this.hasher.verify(superAdmin.passwordHash, password)
      : await this.hasher.verifyAgainstDummy(password);
    if (!superAdmin || !passwordOk) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const now = this.clock.now();
    superAdmin.recordLogin(now);
    await this.superAdmins.save(superAdmin);

    const signed = await this.tokens.sign({ superAdminId: superAdmin.id, email: superAdmin.email });
    return {
      accessToken: signed.token,
      expiresAt: signed.expiresAt,
      superAdmin: { id: superAdmin.id, email: superAdmin.email },
    };
  }
}
