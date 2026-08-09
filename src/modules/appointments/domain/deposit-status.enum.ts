/** Deposit lifecycle (docs/state-machines.md). */
export enum DepositStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Rejected = 'REJECTED',
  Expired = 'EXPIRED',
}
