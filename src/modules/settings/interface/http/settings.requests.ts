import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { DepositType } from '../../domain/settings.types';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateBusinessSettingsRequest {
  @ApiProperty() @IsString() businessName!: string;
  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' }) @IsString() timezone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ default: 'es-AR' }) @IsOptional() @IsString() locale?: string;
}

export class UpdateBookingSettingsRequest {
  @ApiProperty() @IsBoolean() publicBookingEnabled!: boolean;
  @ApiProperty({ example: 15 }) @IsInt() @Min(1) @Max(240) slotGranularityMinutes!: number;
  @ApiProperty({ example: 120 }) @IsInt() @Min(0) minNoticeMinutes!: number;
  @ApiProperty({ example: 60 }) @IsInt() @Min(1) maxAdvanceDays!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationPolicy?: string;
  @ApiProperty() @IsBoolean() requiresManualApproval!: boolean;
}

export class UpdatePaymentSettingsRequest {
  @ApiProperty() @IsBoolean() depositEnabled!: boolean;
  @ApiPropertyOptional({ enum: DepositType })
  @IsOptional()
  @IsEnum(DepositType)
  depositType?: DepositType;
  @ApiPropertyOptional({ example: '30.00' }) @IsOptional() @IsNumberString() depositValue?: string;
  @ApiPropertyOptional({ example: 24, description: 'Horas de validez de la seña (0 = usar default global).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  depositTtlHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountHolder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alias?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cbu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}

export class UpdateNotificationSettingsRequest {
  @ApiProperty() @IsBoolean() emailEnabled!: boolean;
  @ApiProperty() @IsBoolean() whatsappEnabled!: boolean;
  @ApiProperty() @IsBoolean() remindersEnabled!: boolean;
  @ApiProperty({ example: 24 }) @IsInt() @Min(0) @Max(168) reminderHoursBefore!: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  templates?: Record<string, unknown>;
}

export class UpdateBrandingSettingsRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() publicTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() publicDescription?: string;
}

export class BusinessHourInput {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Sunday … 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'opensAt debe tener el formato HH:MM o HH:MM:SS' })
  opensAt?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'closesAt debe tener el formato HH:MM o HH:MM:SS' })
  closesAt?: string;

  @ApiProperty() @IsBoolean() isClosed!: boolean;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'validFrom debe tener el formato YYYY-MM-DD' })
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'validTo debe tener el formato YYYY-MM-DD' })
  validTo?: string;
}

export class SetBusinessHoursRequest {
  @ApiProperty({ type: [BusinessHourInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourInput)
  hours!: BusinessHourInput[];
}
