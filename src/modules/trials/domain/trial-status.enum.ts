/** Trial lifecycle (canonical source: docs/state-machines.md). */
export enum TrialStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Converted = 'CONVERTED',
}

export const TRIAL_STATUSES = Object.values(TrialStatus);

/** Trial length for every new organization (BR-120). */
export const TRIAL_DURATION_DAYS = 30;
