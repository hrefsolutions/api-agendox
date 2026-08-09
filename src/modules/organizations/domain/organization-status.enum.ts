/** Organization lifecycle (canonical source: docs/state-machines.md). */
export enum OrganizationStatus {
  Trial = 'TRIAL',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
  Disabled = 'DISABLED',
}

export const ORGANIZATION_STATUSES = Object.values(OrganizationStatus);
