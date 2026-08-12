import { ApiProperty } from '@nestjs/swagger';

export class TermsStatusResponse {
  @ApiProperty({ example: '2026-08-12', description: 'Versión vigente exigida por la plataforma' })
  currentVersion!: string;

  @ApiProperty({ nullable: true, example: '2026-08-12' })
  acceptedVersion!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  acceptedAt!: Date | null;

  @ApiProperty({ nullable: true, description: 'Usuario que aceptó (Owner)' })
  acceptedByUserId!: string | null;

  @ApiProperty({ description: 'true si nunca aceptó o si aceptó una versión anterior' })
  requiresAcceptance!: boolean;
}
