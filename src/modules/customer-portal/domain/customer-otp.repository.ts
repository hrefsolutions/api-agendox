export interface CustomerOtpRecord {
  id: string;
  organizationId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface CustomerOtpRepository {
  save(record: CustomerOtpRecord): Promise<void>;
  /** Latest not-yet-consumed OTP for the (organization, email) pair. */
  findLatestActive(organizationId: string, email: string): Promise<CustomerOtpRecord | null>;
  /**
   * Latest OTP for the pair, consumed or not. Resend throttling has to look at
   * every code issued, not only the ones still pending.
   */
  findLatest(organizationId: string, email: string): Promise<CustomerOtpRecord | null>;
  /** How many codes were issued to the pair since a point in time. */
  countSince(organizationId: string, email: string, since: Date): Promise<number>;
  /**
   * Oldest OTP still inside the throttling window. It is the one whose ageing
   * out frees a slot, so it drives the "try again in…" hint.
   */
  findOldestSince(
    organizationId: string,
    email: string,
    since: Date,
  ): Promise<CustomerOtpRecord | null>;
  incrementAttempts(id: string): Promise<void>;
  consume(id: string, at: Date): Promise<void>;
}

export const CUSTOMER_OTP_REPOSITORY = Symbol('CUSTOMER_OTP_REPOSITORY');
