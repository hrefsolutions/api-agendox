# Agendox API

Backend for **Agendox**, a multi-tenant booking & scheduling SaaS.

Built as a **Modular Monolith** with **NestJS**, **Clean Architecture** and
light **DDD**, backed by **PostgreSQL** via **Drizzle ORM**. The product
specification is the source of truth and lives in [`../../docs`](../../docs).

> **Status:** MVP backend — Milestones 1–9 implemented (multi-tenancy + auth,
> business configuration, resources/services/clients, availability engine,
> appointments + deposits, public portal + Customer Portal OTP, notifications
> (email + in-app + Web Push), and the trial/subscription gate). Out of MVP
> scope: Super Admin (M10), payment/billing gateways, analytics.
> Implementation decisions and doc reconciliations are recorded in
> [`../../docs/adr/0001-mvp-implementation-decisions.md`](../../docs/adr/0001-mvp-implementation-decisions.md).
> After running migrations, apply the manual overlap constraint in
> [`src/database/sql/appointments-no-overlap.sql`](src/database/sql/appointments-no-overlap.sql).

## Requirements

- Node.js >= 22
- pnpm >= 10
- Docker + Docker Compose (for PostgreSQL)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Create your environment file
cp .env.example .env

# 3. Start PostgreSQL (and optionally the API) with Docker
pnpm docker:up          # starts postgres (+ api if you build it)

# 4. Run the API in watch mode against the local Postgres
pnpm dev
```

The API starts on `http://localhost:3000` by default.

- Health (readiness, includes DB): `GET /health`
- Health (liveness): `GET /health/live`
- Swagger UI: `http://localhost:3000/docs`
- Versioned routes: `http://localhost:3000/api/v1/...`

## Scripts

| Script             | Description                                     |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Start in watch mode                             |
| `pnpm build`       | Compile to `dist/` (with path-alias rewriting)  |
| `pnpm start:prod`  | Run the compiled app                            |
| `pnpm lint`        | ESLint                                          |
| `pnpm format`      | Prettier (write)                                |
| `pnpm test`        | Unit tests (Jest)                               |
| `pnpm test:e2e`    | End-to-end tests                                |
| `pnpm db:generate` | Generate SQL migrations from the Drizzle schema |
| `pnpm db:migrate`  | Apply migrations                                |
| `pnpm db:studio`   | Open Drizzle Studio                             |
| `pnpm docker:up`   | Start the Docker Compose stack                  |
| `pnpm docker:down` | Stop the Docker Compose stack                   |

## Project structure

```text
src/
  main.ts                # bootstrap: versioning, ValidationPipe, CORS, Swagger, filters, logger
  app/                   # composition root (AppModule)
  config/                # ConfigModule, env validation, typed config, logger config
  common/                # cross-cutting: filters, guards, decorators, interceptors, pipes, tenant
  database/              # Drizzle connection, schema barrel, migrations
  health/                # liveness/readiness probes
  modules/               # feature modules (Clean Architecture) — added from Milestone 1
  shared/                # framework-agnostic kernel: errors, utils, types
```

Each future module follows the Clean Architecture layout documented in
[`src/modules/README.md`](src/modules/README.md).

## Path aliases

TypeScript path aliases are configured in `tsconfig.json` and mirrored for Jest:

`@/*`, `@app/*`, `@common/*`, `@config/*`, `@database/*`, `@health/*`,
`@modules/*`, `@shared/*`.

## Configuration

All configuration is validated at startup (`src/config/env.validation.ts`); the
app refuses to boot with an invalid environment. See [`.env.example`](.env.example)
for every supported variable.

## Database & migrations

Drizzle ORM is configured in `drizzle.config.ts`. The aggregated schema lives in
`src/database/drizzle/schema/` and is **empty** in Milestone 0. From Milestone 1,
each module contributes its tables (always tenant-scoped with `organization_id`,
per [`../../docs/04-multi-tenancy.md`](../../docs/04-multi-tenancy.md)).

```bash
pnpm db:generate   # write SQL migrations to src/database/drizzle/migrations
pnpm db:migrate    # apply them
```

## Architecture principles

- **Multi-tenant**: every tenant query is scoped by `organizationId`.
- **Snapshots**: `Appointment` stores an immutable historical snapshot.
- **Availability is computed**, never persisted.
- **Domain layer is framework-free**; dependencies point inward.
- Cross-module communication via contracts and domain events only.

See [`../../AGENTS.md`](../../AGENTS.md) and [`../../docs`](../../docs) before
implementing any domain change.
