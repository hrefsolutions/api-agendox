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
  incrementAttempts(id: string): Promise<void>;
  consume(id: string, at: Date): Promise<void>;
}

export const CUSTOMER_OTP_REPOSITORY = Symbol('CUSTOMER_OTP_REPOSITORY');
