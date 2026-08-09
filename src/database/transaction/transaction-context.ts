import { AsyncLocalStorage } from 'node:async_hooks';

import type { Database } from '../database.constants';

/**
 * The transaction object Drizzle hands to `db.transaction(cb)`. It exposes the
 * same query surface as {@link Database}; the type is derived from Drizzle so
 * it never drifts from the version in use.
 */
export type DrizzleTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Anything that can run a Drizzle query: the pool client or an open transaction. */
export type Executor = Database | DrizzleTransaction;

/**
 * Holds the active transaction for the duration of a unit of work. Repositories
 * read this via {@link BaseDrizzleRepository.executor} so they transparently
 * join the surrounding transaction without the ORM leaking into use-cases.
 */
export const transactionContext = new AsyncLocalStorage<Executor>();
