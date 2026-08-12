import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  CURRENT_TERMS_VERSION,
  TERMS_ACCEPTANCE_REPOSITORY,
  type TermsAcceptance,
  type TermsAcceptanceRepository,
  type TermsStatus,
} from '../domain/terms';

export interface AcceptTermsCommand {
  organizationId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Aceptación de los Términos y Condiciones por parte del negocio.
 *
 * La versión que se registra la elige el servidor, nunca el cliente: si la
 * decidiera el frontend, un panel viejo en caché podría dejar asentado que
 * aceptaron un texto que no es el que se le mostró.
 */
@Injectable()
export class TermsService {
  constructor(
    @Inject(TERMS_ACCEPTANCE_REPOSITORY)
    private readonly acceptances: TermsAcceptanceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getStatus(organizationId: string): Promise<TermsStatus> {
    const latest = await this.acceptances.findLatest(organizationId);
    return this.toStatus(latest);
  }

  async accept(command: AcceptTermsCommand): Promise<TermsStatus> {
    await this.acceptances.record({
      organizationId: command.organizationId,
      userId: command.userId,
      version: CURRENT_TERMS_VERSION,
      acceptedAt: this.clock.now(),
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
    });
    // Se relee la más reciente en vez de asumir que la recién insertada es la
    // última: si alguien aceptara una versión anterior, el estado seguiría
    // siendo el correcto.
    return this.getStatus(command.organizationId);
  }

  /** Historial completo, para auditoría desde el panel de plataforma. */
  history(organizationId: string): Promise<TermsAcceptance[]> {
    return this.acceptances.listByOrganization(organizationId);
  }

  private toStatus(latest: TermsAcceptance | null): TermsStatus {
    return {
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: latest?.version ?? null,
      acceptedAt: latest?.acceptedAt ?? null,
      acceptedByUserId: latest?.userId ?? null,
      // Comparación por igualdad, no por orden: lo que importa es si aceptaron
      // exactamente el texto vigente.
      requiresAcceptance: latest?.version !== CURRENT_TERMS_VERSION,
    };
  }
}
