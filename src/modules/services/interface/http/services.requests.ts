import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceRequest {
  @ApiProperty({ example: 'Corte de pelo' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateServiceRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateServiceOptionRequest {
  @ApiProperty({ example: 'Corte simple' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 30 }) @IsInt() @Min(1) durationMinutes!: number;
  @ApiProperty({ example: 100.5 }) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price!: number;
}

export class UpdateServiceOptionRequest {
  @ApiPropertyOptional({ example: 'Corte + barba' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 45 }) @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
