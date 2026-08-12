import { ApiProperty } from '@nestjs/swagger';

export class RegisterOrganizationResponse {
  @ApiProperty() organizationId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() ownerUserId!: string;
}

export class OrganizationFeaturesResponse {
  @ApiProperty({ description: 'Canal de WhatsApp habilitado (pendiente de implementación)' })
  whatsappNotifications!: boolean;

  @ApiProperty({ description: 'Subida de logo como archivo habilitada' })
  logoUpload!: boolean;

  @ApiProperty({ description: 'Sección de Suscripción visible en el panel del negocio' })
  subscriptionsEnabled!: boolean;
}

export class OrganizationTermsResponse {
  @ApiProperty({ example: '2026-08-12' }) currentVersion!: string;
  @ApiProperty({ nullable: true }) acceptedVersion!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  acceptedAt!: Date | null;
  @ApiProperty({ nullable: true }) acceptedByUserId!: string | null;
  @ApiProperty() requiresAcceptance!: boolean;
}

export class OrganizationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ example: 'TRIAL' }) status!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: OrganizationFeaturesResponse })
  features!: OrganizationFeaturesResponse;

  @ApiProperty({ type: OrganizationTermsResponse })
  terms!: OrganizationTermsResponse;
}
