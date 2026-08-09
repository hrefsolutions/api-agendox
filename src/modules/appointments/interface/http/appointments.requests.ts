import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { AppointmentStatus } from '../../domain/appointment-status.enum';

export class CreateAppointmentRequest {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty() @IsUUID() serviceOptionId!: string;
  @ApiProperty() @IsUUID() resourceId!: string;
  @ApiProperty() @IsUUID() clientId!: string;
  @ApiProperty({ example: '2026-08-03T12:00:00.000Z', description: 'Start instant (UTC ISO)' })
  @IsDateString()
  startsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CalendarQueryRequest {
  @ApiProperty({ example: '2026-08-03T00:00:00.000Z' }) @IsDateString() from!: string;
  @ApiProperty({ example: '2026-08-10T00:00:00.000Z' }) @IsDateString() to!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() resourceId?: string;
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}

export class CancelAppointmentRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class RejectAppointmentRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
