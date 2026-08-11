import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SuperAdminLoginRequest {
  @ApiProperty({ example: 'admin@agendox.local' }) @IsEmail() email!: string;
  @ApiProperty() @IsString() @IsNotEmpty() password!: string;
}

export class CreateOrganizationOwnerRequest {
  @ApiProperty({ example: 'dueño@negocio.com' })
  @IsEmail()
  email!: string;

  /**
   * Contraseña inicial. El mínimo de 10 acompaña la política del login; el dueño
   * la puede cambiar después desde el panel.
   */
  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
}

export class CreateOrganizationRequest {
  @ApiProperty({ example: 'Barbería Central' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  organizationName!: string;

  @ApiProperty({
    example: 'barberia-central',
    description: 'Slug público, único en toda la plataforma (minúsculas y guiones)',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo admite minúsculas, números y guiones simples',
  })
  @MaxLength(63)
  slug!: string;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({ type: CreateOrganizationOwnerRequest })
  @ValidateNested()
  @Type(() => CreateOrganizationOwnerRequest)
  owner!: CreateOrganizationOwnerRequest;
}

export class UpdateOrganizationRequest {
  @ApiPropertyOptional({ example: 'Barbería Central' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timezone?: string;
}

/**
 * Solo los flags presentes se modifican, así el panel puede mandar un toggle
 * suelto sin arrastrar el resto del estado.
 */
export class UpdateOrganizationFeaturesRequest {
  @ApiPropertyOptional({ description: 'Habilita el canal de WhatsApp' })
  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Habilita la subida de logo como archivo' })
  @IsOptional()
  @IsBoolean()
  logoUpload?: boolean;
}
