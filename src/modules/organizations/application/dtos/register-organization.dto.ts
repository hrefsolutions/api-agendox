import type { TermsStatus } from '@modules/legal/domain/terms';

import type { OrganizationFeatures } from '../../domain/organization-features';

export interface RegisterOrganizationCommand {
  organizationName: string;
  slug: string;
  timezone: string;
  owner: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

export interface RegisterOrganizationResult {
  organizationId: string;
  slug: string;
  ownerUserId: string;
}

export interface OrganizationView {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  createdAt: Date;
  /**
   * Flags que gobierna el super admin. Viajan acá para que el panel del negocio
   * sepa qué habilitar sin un request aparte: el layout ya pide esta ruta.
   */
  features: OrganizationFeatures;
  /**
   * Estado de aceptación de los Términos y Condiciones. Viaja acá por el mismo
   * motivo que `features`: el layout del panel ya pide esta ruta, y así puede
   * decidir si muestra el gate de aceptación sin un request extra.
   */
  terms: TermsStatus;
}
