# Modules

Feature modules of the **Modular Monolith**. Each module is a bounded context
with clear boundaries and low coupling (see `docs/02-arquitectura.md` and
`docs/11-backend-nestjs.md`).

> Milestone 0 (Fundación) intentionally contains **no** domain modules.
> Business modules are added from Milestone 1 onward per `docs/13-roadmap.md`.

## Planned modules

`authentication`, `organizations`, `users`, `resources`, `clients`, `services`,
`service-options`, `calendar`, `availability`, `appointments`,
`customer-portal`, `deposits`, `notifications`, `payments`, `billing`, `plans`,
`subscriptions`, `trials`, `administration`, `analytics`, `audit-logs`.

## Internal structure of a module (Clean Architecture)

```text
<module-name>/
  domain/            # entities, value objects, domain events, repository & service contracts
    entities/
    value-objects/
    events/
    repositories/
    services/
  application/        # use-cases, internal DTOs, ports (framework-agnostic orchestration)
    use-cases/
    dtos/
    ports/
  infrastructure/     # Drizzle repositories, providers, mappers, external integrations
    persistence/
    providers/
    mappers/
  interface/          # HTTP controllers, request/response models, presenters
    http/
      controllers/
      requests/
      responses/
  <module-name>.module.ts
```

## Dependency rule

Dependencies point inward only:

```text
interface ──▶ application ──▶ domain
infrastructure ──▶ application ──▶ domain
```

- `domain` depends on nothing (no NestJS, no ORM).
- `application` depends only on `domain` (and ports it declares).
- `infrastructure` and `interface` depend on `application`/`domain` contracts.

## Cross-module communication

Modules communicate only through application contracts, exported public
services, or domain events — never by reaching into another module's tables
(see `docs/02-arquitectura.md`).

## Multi-tenancy

Every tenant-scoped operation must be filtered by `organizationId`
(`docs/04-multi-tenancy.md`). Repositories are tenant-aware by contract.
