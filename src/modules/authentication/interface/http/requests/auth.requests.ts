import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

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

export class ChangePasswordRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  /**
   * El mínimo de 10 acompaña la política del alta de organización. El máximo de
   * 72 es el límite de bytes que acepta el hasher.
   */
  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  newPassword!: string;
}
