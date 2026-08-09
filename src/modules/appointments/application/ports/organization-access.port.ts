/**
 * Gate that decides whether an organization may accept new bookings: it must be
 * operational (not suspended/disabled) and have an active trial or subscription
 * (BR-120/130/131). Implemented by the subscriptions module (M9).
 */
export interface OrganizationAccess {
  canOperate(organizationId: string): Promise<boolean>;
}

export const ORGANIZATION_ACCESS = Symbol('ORGANIZATION_ACCESS');
