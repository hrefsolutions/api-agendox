import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';

import type { AuthResult } from '../../../application/dtos/auth-result';
import { ChangePassword } from '../../../application/use-cases/change-password.use-case';
import { LoginStaff } from '../../../application/use-cases/login-staff.use-case';
import { LogoutStaff } from '../../../application/use-cases/logout-staff.use-case';
import { RefreshSession } from '../../../application/use-cases/refresh-session.use-case';
import {
  ChangePasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
} from '../requests/auth.requests';
import { AuthResponse } from '../responses/auth.responses';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginStaff: LoginStaff,
    private readonly refreshSession: RefreshSession,
    private readonly logoutStaff: LogoutStaff,
    private readonly changePassword: ChangePassword,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOkResponse({ type: AuthResponse })
  login(@Body() body: LoginRequest): Promise<AuthResult> {
    return this.loginStaff.execute(body);
  }

  @Public()
  @Post('refresh')
  @ApiOkResponse({ type: AuthResponse })
  refresh(@Body() body: RefreshRequest): Promise<AuthResult> {
    return this.refreshSession.execute(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: LogoutRequest): Promise<void> {
    await this.logoutStaff.execute(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() principal: StaffPrincipal): StaffPrincipal {
    return principal;
  }

  /**
   * Cambio de contraseña por el propio usuario, para cualquier rol. Es la única
   * salida de la contraseña temporal con la que se da de alta al staff.
   */
  @Post('change-password')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeOwnPassword(
    @CurrentUser() principal: StaffPrincipal,
    @Body() body: ChangePasswordRequest,
  ): Promise<void> {
    await this.changePassword.execute({
      organizationId: principal.organizationId,
      userId: principal.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  }
}
