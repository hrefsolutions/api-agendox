import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class OtpRequestRequest {
  @ApiProperty({ example: 'cliente@example.com' }) @IsEmail() email!: string;
}

export class OtpVerifyRequest {
  @ApiProperty({ example: 'cliente@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code debe tener 6 dígitos' })
  code!: string;
}

export class UpdateProfileRequest {
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty({ example: '+5491122334455' }) @IsString() @IsNotEmpty() whatsapp!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class BookRequest {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty() @IsUUID() serviceOptionId!: string;
  @ApiProperty() @IsUUID() resourceId!: string;
  @ApiProperty({ example: '2026-08-03T12:00:00.000Z' }) @IsDateString() startsAt!: string;
  @ApiPropertyOptional({ description: 'Clave de idempotencia (UUID) para evitar reservas duplicadas.' })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
