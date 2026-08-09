/** Reason category for a resource/organization time block. */
export enum BlockedTimeType {
  Vacation = 'VACATION',
  License = 'LICENSE',
  Maintenance = 'MAINTENANCE',
  Manual = 'MANUAL',
}

export const BLOCKED_TIME_TYPES = Object.values(BlockedTimeType);
