import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from './drizzle/schema';

/**
 * Injection token for the Drizzle database instance.
 *
 * Usage:
 *   constructor(@Inject(DRIZZLE) private readonly db: Database) {}
 */
export const DRIZZLE = Symbol('DRIZZLE_ORM');

/**
 * Typed Drizzle client bound to the aggregated schema. As modules register
 * tables in the schema barrel, this type gains full query typing automatically.
 */
export type Database = NodePgDatabase<typeof schema>;
