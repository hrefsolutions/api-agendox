-- ---------------------------------------------------------------------------
-- Hard database guarantee against double-booking a resource.
--
-- This is belt-and-suspenders on top of the transactional `SELECT ... FOR
-- UPDATE` + overlap check in CreateAppointment. Drizzle Kit cannot generate an
-- EXCLUDE constraint, so it is applied here as a raw, IDEMPOTENT step. The
-- `migrate` compose service runs it after `drizzle-kit migrate` on every deploy
-- (see `scripts/apply-constraints.ts` and `pnpm db:deploy`); it is also safe to
-- run by hand:
--
--   psql "$DATABASE_URL" -f src/database/sql/appointments-no-overlap.sql
--
-- An overlapping insert/update then fails with SQLSTATE 23P01, which the global
-- exception filter maps to HTTP 409 (CONFLICT). Rows leaving the active set
-- (CANCELLED/REJECTED/NO_SHOW) automatically free their slot.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so guard it to stay idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (
        organization_id WITH =,
        resource_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (status IN ('PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED', 'COMPLETED'));
  END IF;
END
$$;
