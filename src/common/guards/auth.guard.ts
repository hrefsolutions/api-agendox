import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AuthConfig } from '@config/configuration';
import { Role } from '@shared/domain';
import { UnauthorizedError } from '@shared/errors';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { StaffPrincipal } from '../tenant/request-context';
import { TenantContextService } from '../tenant/tenant-context.service';

/** Claims carried by a staff access token. */
export interface AccessTokenPayload {
  sub: string;
  org: string;
  role: Role;
  email: string;
  typ: 'staff';
}

/**
 * Global authentication guard for staff routes. Verifies the Bearer access
 * token, builds the {@link StaffPrincipal} and publishes it to both the request
 * object (for param decorators) and the tenant context (for repositories).
 *
 * Routes annotated with `@Public()` skip authentication.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly accessSecret: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContextService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<AuthConfig>('auth').accessSecret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: StaffPrincipal }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('Falta el encabezado de autorización o tiene un formato inválido');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessSecret,
      });
    } catch {
      throw new UnauthorizedError('El token de acceso es inválido o expiró');
    }

    if (payload.typ !== 'staff') {
      throw new UnauthorizedError('El token no es un token de acceso de staff');
    }

    const principal: StaffPrincipal = {
      userId: payload.sub,
      organizationId: payload.org,
      role: payload.role,
      email: payload.email,
    };
    request.user = principal;
    this.tenantContext.setPrincipal(principal);
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : undefined;
  }
}
