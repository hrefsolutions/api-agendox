/**
 * Bootstraps (upserts) the platform super admin from the environment. Idempotent
 * — re-running updates the password to match `SUPERADMIN_PASSWORD`. Run once per
 * deploy after migrations: `pnpm db:seed:superadmin`.
 */
import { hash } from '@node-rs/argon2';
import { Client } from 'pg';

// Load .env for standalone invocations (ts-node no lo hace solo).
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usa el entorno ya presente (contenedor/CI).
}

async function main(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const connectionString = process.env.DATABASE_URL;
  if (!email || !password) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required.');
  }
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const passwordHash = await hash(password);
  const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString, ssl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO super_admins (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
      [email.trim().toLowerCase(), passwordHash],
    );
    console.log(`[seed:superadmin] upserted ${email.trim().toLowerCase()}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[seed:superadmin] failed:', error);
  process.exit(1);
});
