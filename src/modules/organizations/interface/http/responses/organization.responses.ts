import { ApiProperty } from '@nestjs/swagger';

export class RegisterOrganizationResponse {
  @ApiProperty() organizationId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() ownerUserId!: string;
}

export class OrganizationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ example: 'TRIAL' }) status!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() createdAt!: Date;
}
