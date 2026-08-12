import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { UserStatus } from '@modules/users/domain/user-status.enum';

/**
 * Con qué arranca comercialmente un negocio nuevo.
 *
 * `TRIAL` es el camino normal: 30 días de prueba y después el dueño paga por la
 * pasarela. `ACTIVE` deja la suscripción activa sin cobrar — cuentas de cortesía,
 * internas o de QA — y exige elegir el plan.
 */
export enum OrganizationBilling {
  Trial = 'TRIAL',
  Active = 'ACTIVE',
}

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

  @ApiPropertyOptional({
    enum: OrganizationBilling,
    default: OrganizationBilling.Trial,
    description: 'TRIAL: 30 días de prueba. ACTIVE: suscripción activa sin cobrar.',
  })
  @IsOptional()
  @IsEnum(OrganizationBilling)
  billing?: OrganizationBilling;

  /** Obligatorio con `billing=ACTIVE`: no se puede activar sin saber qué plan. */
  @ApiPropertyOptional({ description: 'Plan a otorgar. Requerido si billing=ACTIVE.' })
  @ValidateIf((o: CreateOrganizationRequest) => o.billing === OrganizationBilling.Active)
  @IsUUID()
  planId?: string;
}

export class UpdateOwnerEmailRequest {
  @ApiProperty({ example: 'dueño@negocio.com' })
  @IsEmail()
  email!: string;
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
 * Alta de un recepcionista. **No lleva rol**: lo fija el servidor
 * (`Role.Receptionist`), así la API de plataforma no puede crear un Owner ni un
 * Admin. Tampoco lleva contraseña: se genera y se devuelve una sola vez.
 */
export class CreateOrganizationUserRequest {
  @ApiProperty({ example: 'recepcion@negocio.com' })
  @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) firstName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) lastName!: string;
}

export class UpdateOrganizationUserRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
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

  @ApiPropertyOptional({
    description: 'Muestra la sección de Suscripción en el panel del negocio',
  })
  @IsOptional()
  @IsBoolean()
  subscriptionsEnabled?: boolean;
}
