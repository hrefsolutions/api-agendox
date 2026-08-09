import { Inject, Injectable } from '@nestjs/common';

import type { UnitOfWork } from '@shared/application';

import { DRIZZLE, type Database } from '../database.constants';
import { transactionContext } from './transaction-context';

/**
 * Drizzle-backed {@link UnitOfWork}. Opens a single database transaction and
 * binds it to the {@link transactionContext} for the duration of `work`, so any
 * repository invoked inside runs against the same transaction.
 */
@Injectable()
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => transactionContext.run(tx, work));
  }
}
