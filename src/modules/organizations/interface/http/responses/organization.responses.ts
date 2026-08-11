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
}
