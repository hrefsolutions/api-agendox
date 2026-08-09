import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Role } from '@shared/domain';

import { UserStatus } from '../../domain/user-status.enum';

export class CreateUserRequest {
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty({ example: 'staff@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ enum: Role, example: Role.Receptionist })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateUserRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() lastName?: string;
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
