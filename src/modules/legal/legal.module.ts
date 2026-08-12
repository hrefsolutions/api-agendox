import { Module } from '@nestjs/common';

import { TermsService } from './application/terms.service';
import { TERMS_ACCEPTANCE_REPOSITORY } from './domain/terms';
import { DrizzleTermsAcceptanceRepository } from './infrastructure/persistence/drizzle-terms-acceptance.repository';
import { LegalController } from './interface/http/legal.controller';

/**
 * Aceptación de los Términos y Condiciones por organización.
 *
 * Exporta {@link TermsService} para que otros módulos puedan leer el estado sin
 * un request aparte: `GET /organizations/current` lo incluye (así el panel
 * decide si muestra el gate en la misma carga) y el panel de plataforma lo usa
 * para auditar qué aceptó cada negocio.
 */
@Module({
  controllers: [LegalController],
  providers: [
    { provide: TERMS_ACCEPTANCE_REPOSITORY, useClass: DrizzleTermsAcceptanceRepository },
    TermsService,
  ],
  exports: [TermsService],
})
export class LegalModule {}
