/** Lifecycle status of a client (end customer of a tenant). */
export enum ClientStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export const CLIENT_STATUSES = Object.values(ClientStatus);
