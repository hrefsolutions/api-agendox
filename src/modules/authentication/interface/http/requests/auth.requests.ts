import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequest {
  @ApiProperty({ example: 'owner@barberia.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'super-secret' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
