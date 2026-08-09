import type { Database } from '../database.constants';
import { transactionContext } from '../transaction/transaction-context';

/**
 * Base class for Drizzle repositories.
 *
 * Subclasses inject {@link DRIZZLE} and pass it to `super`. They MUST issue
 * every query through {@link executor} (never the raw client) so that, when a
 * {@link UnitOfWork} is active, the query joins the surrounding transaction.
 *
 * Tenant safety: repository methods always require an `organizationId` and must
 * filter by it (see docs/04-multi-tenancy.md).
 */
export abstract class BaseDrizzleRepository {
  protected constructor(private readonly db: Database) {}

  /**
   * The active transaction if one is running, otherwise the pool client. Typed
   * as {@link Database}: the transaction shares the same query surface, so this
   * cast keeps repository call sites free of union-type friction.
   */
  protected get executor(): Database {
    return transactionContext.getStore() ?? this.db;
  }
}
