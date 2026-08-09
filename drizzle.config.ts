import { defineConfig } from 'drizzle-kit';

// Load .env for standalone drizzle-kit invocations (Node >= 20.12).
// In containers/CI the environment is already populated, so this is best-effort.
try {
  process.loadEnvFile();
} catch {
  // No local .env file; rely on the ambient environment.
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run drizzle-kit commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/drizzle/schema/index.ts',
  out: './src/database/drizzle/migrations',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
