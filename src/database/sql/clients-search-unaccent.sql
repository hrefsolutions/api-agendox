-- ---------------------------------------------------------------------------
-- Accent-insensitive search over clients.
--
-- `ILIKE` folds case but NOT diacritics: `'Sebastián' ILIKE '%Sebastian%'` is
-- false, so anyone typing without tildes (i.e. everyone) found nothing. The
-- clients repository compares `unaccent(lower(col)) LIKE unaccent(lower(term))`
-- instead, which requires the `unaccent` contrib extension to exist.
--
-- Applied as a raw, IDEMPOTENT step after `drizzle-kit migrate` on every deploy
-- (see `scripts/apply-constraints.ts` and `pnpm db:deploy`), same as
-- `appointments-no-overlap.sql`. Also safe to run by hand:
--
--   psql "$DATABASE_URL" -f src/database/sql/clients-search-unaccent.sql
--
-- NOTE: `unaccent()` is STABLE, not IMMUTABLE, so it cannot back an expression
-- index directly (it needs an IMMUTABLE wrapper function). That costs nothing
-- today: the search uses a leading wildcard, which no B-tree could serve either.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent;
