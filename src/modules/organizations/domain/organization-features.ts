/**
 * Funcionalidades habilitables por organización, gobernadas por el super admin.
 *
 * Agregar un flag es: un campo acá, una columna en
 * `organization-features.schema.ts` con `default false`, y la entrada
 * correspondiente en el formulario del panel de plataforma.
 */
export interface OrganizationFeatures {
  /**
   * Canal de WhatsApp en las notificaciones. Apagado mientras la integración no
   * exista: el negocio ve la opción pero no la puede activar.
   */
  whatsappNotifications: boolean;
  /**
   * Subida de logo como archivo. Requiere almacenamiento de objetos, que todavía
   * no está montado; el logo por URL funciona siempre y no depende de este flag.
   */
  logoUpload: boolean;
  /**
   * Sección de Suscripción en el panel del negocio. Apagarla oculta el plan y el
   * checkout: se usa para cuentas de cortesía, internas o de demo.
   */
  subscriptionsEnabled: boolean;
}

/**
 * Estado de una organización sin fila propia. No es "todo apagado": cada flag
 * arranca en el valor que corresponde a un negocio nuevo — lo que todavía no
 * existe, apagado; lo que ya funciona, prendido.
 */
export const DEFAULT_ORGANIZATION_FEATURES: OrganizationFeatures = {
  whatsappNotifications: false,
  logoUpload: false,
  subscriptionsEnabled: true,
};

export interface OrganizationFeaturesRepository {
  find(organizationId: string): Promise<OrganizationFeatures | null>;
  /** Upsert parcial: solo toca los flags presentes en `changes`. */
  save(
    organizationId: string,
    changes: Partial<OrganizationFeatures>,
    now: Date,
  ): Promise<OrganizationFeatures>;
  delete(organizationId: string): Promise<void>;
}

export const ORGANIZATION_FEATURES_REPOSITORY = Symbol('ORGANIZATION_FEATURES_REPOSITORY');
