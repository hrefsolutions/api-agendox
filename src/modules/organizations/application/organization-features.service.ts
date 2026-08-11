import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import {
  DEFAULT_ORGANIZATION_FEATURES,
  ORGANIZATION_FEATURES_REPOSITORY,
  type OrganizationFeatures,
  type OrganizationFeaturesRepository,
} from '../domain/organization-features';

/**
 * Lectura y escritura de los flags de funcionalidad de una organización.
 *
 * La escritura es exclusiva del super admin (se expone solo desde su
 * controlador); la lectura la usa el panel del negocio para saber qué mostrar
 * habilitado y qué mostrar apagado con su explicación.
 */
@Injectable()
export class OrganizationFeaturesService {
  constructor(
    @Inject(ORGANIZATION_FEATURES_REPOSITORY)
    private readonly repository: OrganizationFeaturesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Nunca falla por ausencia: una organización sin fila devuelve los defaults. */
  async get(organizationId: string): Promise<OrganizationFeatures> {
    const stored = await this.repository.find(organizationId);
    return stored ?? { ...DEFAULT_ORGANIZATION_FEATURES };
  }

  update(
    organizationId: string,
    changes: Partial<OrganizationFeatures>,
  ): Promise<OrganizationFeatures> {
    return this.repository.save(organizationId, changes, this.clock.now());
  }
}
