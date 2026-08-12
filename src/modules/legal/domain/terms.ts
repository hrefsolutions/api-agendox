/**
 * Versión vigente de los Términos y Condiciones que el negocio tiene que
 * aceptar.
 *
 * El backend es la autoridad: decide si hace falta aceptar y qué versión queda
 * registrada. El texto vive en el frontend (`@agendox/legal`), que exporta esta
 * misma cadena — **cuando cambie el documento hay que bumpear las dos**, y
 * conviene hacerlo en el mismo commit. Bumpear acá reabre el gate para todas
 * las organizaciones, así que se bumpea solo cuando el cambio es sustantivo
 * (obligaciones, datos, precios), no por una corrección de tipeo.
 *
 * Formato: `AAAA-MM-DD` de la fecha de vigencia.
 */
export const CURRENT_TERMS_VERSION = '2026-08-12';

/** Una aceptación registrada. Es un hecho histórico: se inserta, nunca se edita. */
export interface TermsAcceptance {
  organizationId: string;
  /** Usuario (Owner) que aceptó. */
  userId: string;
  version: string;
  acceptedAt: Date;
  /**
   * Evidencia de la aceptación. Son datos personales de bajo riesgo que se
   * guardan por su valor probatorio; pueden faltar si el proxy no los envía.
   */
  ipAddress: string | null;
  userAgent: string | null;
}

/** Lo que el panel necesita para decidir si muestra el gate. */
export interface TermsStatus {
  /** Versión que hoy exige la plataforma. */
  currentVersion: string;
  /** Última versión aceptada por la organización, o `null` si nunca aceptó. */
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  /** `true` si nunca aceptó o si aceptó una versión anterior a la vigente. */
  requiresAcceptance: boolean;
}

export interface TermsAcceptanceRepository {
  /** Aceptación más reciente de la organización, por `acceptedAt`. */
  findLatest(organizationId: string): Promise<TermsAcceptance | null>;
  /**
   * Registra la aceptación. Idempotente por `(organización, versión)`: si esa
   * versión ya estaba aceptada devuelve la aceptación original en vez de
   * duplicarla — un doble click no ensucia la evidencia.
   */
  record(acceptance: TermsAcceptance): Promise<TermsAcceptance>;
  /** Todas las aceptaciones, de la más nueva a la más vieja. */
  listByOrganization(organizationId: string): Promise<TermsAcceptance[]>;
}

export const TERMS_ACCEPTANCE_REPOSITORY = Symbol('TERMS_ACCEPTANCE_REPOSITORY');
