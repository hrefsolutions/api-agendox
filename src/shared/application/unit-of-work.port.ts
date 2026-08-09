/**
 * Transactional boundary for use-cases.
 *
 * Wraps a unit of work in a single database transaction. The domain/application
 * layers depend only on this contract, never on the ORM: the infrastructure
 * implementation (Drizzle) makes any repository call inside `work` run against
 * the active transaction (see database/transaction).
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
