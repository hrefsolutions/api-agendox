import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { BlockedTimeType } from '../../domain/blocked-time-type.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateResourceRequest {
  @ApiProperty({ example: 'Cancha 1' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({
    example: 'court',
    description: 'person | court | office | room | box | equipment | …',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;
  @ApiPropertyOptional({ example: '#3366ff' }) @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Linked staff user (if the resource is a person)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdateResourceRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
}

export class ResourceScheduleEntryInput {
  @ApiProperty({ minimum: 0, maximum: 6 }) @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @ApiProperty({ example: '09:00' }) @Matches(TIME_PATTERN) startsAt!: string;
  @ApiProperty({ example: '18:00' }) @Matches(TIME_PATTERN) endsAt!: string;
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  validFrom?: string;
  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Matches(DATE_PATTERN)
  validTo?: string;
}

export class SetResourceScheduleRequest {
  @ApiProperty({ type: [ResourceScheduleEntryInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceScheduleEntryInput)
  entries!: ResourceScheduleEntryInput[];
}

export class AssignServiceRequest {
  @ApiProperty() @IsUUID() serviceId!: string;
}

export class CreateBlockedTimeRequest {
  @ApiPropertyOptional({ description: 'Null = blocks the whole organization' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  // Wall-clock local time in the org's timezone (from a datetime-local input);
  // the backend converts to UTC using the organization's timezone.
  @ApiProperty({ example: '2026-08-01T12:00' })
  @Matches(LOCAL_DATETIME_PATTERN, { message: 'startsAt debe tener el formato YYYY-MM-DDTHH:MM' })
  startsAt!: string;
  @ApiProperty({ example: '2026-08-01T16:00' })
  @Matches(LOCAL_DATETIME_PATTERN, { message: 'endsAt debe tener el formato YYYY-MM-DDTHH:MM' })
  endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiProperty({ enum: BlockedTimeType }) @IsEnum(BlockedTimeType) type!: BlockedTimeType;
}
