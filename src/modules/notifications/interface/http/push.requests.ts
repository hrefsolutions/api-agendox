import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PushSubscribeRequest {
  @ApiProperty() @IsString() @IsNotEmpty() endpoint!: string;
  @ApiProperty() @IsString() @IsNotEmpty() p256dh!: string;
  @ApiProperty() @IsString() @IsNotEmpty() auth!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userAgent?: string;
}

export class PushUnsubscribeRequest {
  @ApiProperty() @IsString() @IsNotEmpty() endpoint!: string;
}
