import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SuperAdminLoginRequest {
  @ApiProperty({ example: 'admin@agendox.local' }) @IsEmail() email!: string;
  @ApiProperty() @IsString() @IsNotEmpty() password!: string;
}
