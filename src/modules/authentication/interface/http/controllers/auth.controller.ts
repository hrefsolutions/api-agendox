import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import type { StaffPrincipal } from '@common/tenant/request-context';

import type { AuthResult } from '../../../application/dtos/auth-result';
import { LoginStaff } from '../../../application/use-cases/login-staff.use-case';
import { LogoutStaff } from '../../../application/use-cases/logout-staff.use-case';
import { RefreshSession } from '../../../application/use-cases/refresh-session.use-case';
import { LoginRequest, LogoutRequest, RefreshRequest } from '../requests/auth.requests';
import { AuthResponse } from '../responses/auth.responses';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginStaff: LoginStaff,
    private readonly refreshSession: RefreshSession,
    private readonly logoutStaff: LogoutStaff,
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
}
