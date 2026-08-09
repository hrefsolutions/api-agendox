import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { UnauthorizedError } from '@shared/errors';

import { SuperAdminTokenService } from '../../infrastructure/super-admin-token.service';

/** Authenticated platform operator, attached to the request by the guard. */
export interface SuperAdminPrincipal {
  superAdminId: string;
  email: string;
}

/**
 * Authenticates super-admin routes. Applied via `@UseGuards` on controllers
 * that are also `@Public()` (to bypass the global staff `AuthGuard`), mirroring
 * the customer portal's OTP guard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly tokens: SuperAdminTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { superAdmin?: SuperAdminPrincipal }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('Falta el token de super admin');
    }

    let payload;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedError('El token de super admin es inválido o expiró');
    }
    if (payload.typ !== 'superadmin') {
      throw new UnauthorizedError('El token no es de super admin');
    }

    request.superAdmin = { superAdminId: payload.sub, email: payload.email };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : undefined;
  }
}
