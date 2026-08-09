import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ClientStatus } from '../../domain/client-status.enum';

export class CreateClientRequest {
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty({ example: 'cliente@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: '+5491122334455' }) @IsString() @IsNotEmpty() whatsapp!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateClientRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
