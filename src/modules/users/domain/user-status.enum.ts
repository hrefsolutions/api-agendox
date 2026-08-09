/** Lifecycle status of an internal (staff) user. Only ACTIVE users can log in. */
export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export const USER_STATUSES = Object.values(UserStatus);
