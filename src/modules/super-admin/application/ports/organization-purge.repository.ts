/**
 * Borrado físico de una organización y de todo lo que cuelga de ella.
 *
 * Es cross-tenant y cross-módulo por naturaleza: barre todas las tablas con
 * `organization_id`, así que vive en el super admin (el único que puede
 * ejecutarlo) y no en el repositorio de organizaciones, que es por tenant.
 */
export interface OrganizationPurgeRepository {
  /**
   * Borra la organización y sus filas en una sola transacción.
   *
   * @returns cuántas filas se borraron por tabla, para dejarlo en el log de
   * auditoría: es la única evidencia que queda de lo que había.
   */
  purge(organizationId: string): Promise<PurgeReport>;
}

/** Filas borradas por tabla, más el total. Sólo aparecen las tablas con filas. */
export interface PurgeReport {
  total: number;
  byTable: Record<string, number>;
}

export const ORGANIZATION_PURGE_REPOSITORY = Symbol('ORGANIZATION_PURGE_REPOSITORY');
