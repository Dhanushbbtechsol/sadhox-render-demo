# Security Audit: Dev D (Phase 1)

Reaudit 2026-09-28: see [phase1.md](../phase1.md).

## High

### [A01] Missing Global Authorization Guard — apps/server/src/app.controller.ts

**Status: FIXED on Nest `main.ts`.** Still open as leftover Hono.

Nest is the documented API entry (`src/main.ts`). Global auth in `apps/server/src/app.module.ts`:

- `JwtAuthGuard` as `APP_GUARD` — Bearer required unless `@Public()`
- `RolesGuard` as `APP_GUARD` — `@Roles(...)` when set

`@Public()` on: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /health`.

**Regression:** `apps/server/src/index.ts` and `apps/server/src/routes/auth.ts` were not removed. Demo Admin password `"password"` and default JWT secrets are still in tree.

## Low / Hardening

### [A05] Database Connection String — packages/db/.env

**Status: FIXED** (there is no `packages/db` package)

`DATABASE_URL` comes from env via Nest `ConfigModule` + Zod. `.env` is gitignored. `cred.md` is gitignored and untracked.

Open from reaudit: public Swagger, unused Throttler, seed password in OpenAPI example.
