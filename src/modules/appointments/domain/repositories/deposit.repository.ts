import type { Deposit } from '../entities/deposit.entity';

export interface DepositRepository {
  save(deposit: Deposit): Promise<void>;
  findById(organizationId: string, id: string): Promise<Deposit | null>;
  findActiveByAppointment(organizationId: string, appointmentId: string): Promise<Deposit | null>;
  listPending(organizationId: string): Promise<Deposit[]>;
  /** Pending deposits whose per-org expiry has passed (cross-tenant; expiry job). */
  findExpired(now: Date, limit: number): Promise<Deposit[]>;
}

export const DEPOSIT_REPOSITORY = Symbol('DEPOSIT_REPOSITORY');
