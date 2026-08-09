import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityQueryRequest {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty() @IsUUID() serviceOptionId!: string;
  @ApiPropertyOptional({ description: 'Omit for "any available resource"' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiProperty({ example: '2026-08-03' }) @Matches(DATE_PATTERN) fromDate!: string;
  @ApiProperty({ example: '2026-08-09' }) @Matches(DATE_PATTERN) toDate!: string;
}
