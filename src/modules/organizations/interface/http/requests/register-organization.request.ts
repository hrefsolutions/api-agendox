import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength, ValidateNested } from 'class-validator';

export class OwnerRequest {
  @ApiProperty({ example: 'owner@barberia.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'super-secret', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}

export class RegisterOrganizationRequest {
  @ApiProperty({ example: 'Barbería Central' })
  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @ApiProperty({ example: 'barberia-central', description: 'Public, globally-unique slug' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({ type: OwnerRequest })
  @ValidateNested()
  @Type(() => OwnerRequest)
  owner!: OwnerRequest;
}
