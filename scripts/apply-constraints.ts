/**
 * Applies the raw SQL under `src/database/sql/` that Drizzle Kit cannot express
 * (currently the appointments EXCLUDE constraint). Runs after `drizzle-kit
 * migrate` as part of `pnpm db:deploy`; the compose `migrate` service invokes it
 * on every deploy, so each `.sql` file MUST be idempotent.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Client } from 'pg';

const SQL_DIR = join(__dirname, '..', 'src', 'database', 'sql');

// Load .env for standalone invocations (ts-node no lo hace solo).
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usa el entorno ya presente (contenedor/CI).
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to apply SQL constraints.');
  }

  const files = readdirSync(SQL_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    console.log('[constraints] no .sql files to apply.');
    return;
  }

  const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString, ssl });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(join(SQL_DIR, file), 'utf8');
      console.log(`[constraints] applying ${file}…`);
      await client.query(sql);
    }
    console.log(`[constraints] done (${files.length} file(s)).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[constraints] failed:', error);
  process.exit(1);
});
