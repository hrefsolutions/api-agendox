/** Subscription lifecycle (canonical source: docs/state-machines.md). */
export enum SubscriptionStatus {
  /** Checkout created, awaiting the payer's authorization at the gateway. */
  Pending = 'PENDING',
  Active = 'ACTIVE',
  PastDue = 'PAST_DUE',
  Suspended = 'SUSPENDED',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
}
