import { ApiProperty } from '@nestjs/swagger';

import { Role } from '@shared/domain';

export class AuthUserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() organizationId!: string;
}

export class AuthResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: AuthUserResponse }) user!: AuthUserResponse;
}
