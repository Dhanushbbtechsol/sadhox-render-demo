# Phase 1 reaudit — 2026-09-28

Scope: merged `Audit` tree after Dev A–D Phase 1. Stack: React/Vite + Zustand, NestJS (`apps/server` start = `main.ts`), Drizzle/Postgres, Passport JWT.

**Result: CLEAN — 0 open findings, 0 advisories** (reverified same day)

## High

### [A07] Leftover Hono demo auth with hardcoded Admin password — apps/server/src/routes/auth.ts

**Status: FIXED**

Deleted `apps/server/src/index.ts`, `apps/server/src/routes/auth.ts`, and `apps/server/src/routes/catalog.ts`. Nest `main.ts` is the only API entry.

## Medium

### [A07] Login has no rate limit — apps/server/src/auth/auth.controller.ts

**Status: FIXED** — `ThrottlerGuard` global; login **5/min**, refresh **10/min**.

### [A02] Access token stored in localStorage — apps/web/src/stores/auth-store.ts

**Status: FIXED** — `partialize` omits `accessToken`; restore via httpOnly refresh cookie.

### [A05] Swagger UI is public — apps/server/src/main.ts

**Status: FIXED** — `/docs` only when `NODE_ENV !== "production"`.

### [A07] Shared seed password in OpenAPI — apps/server/scripts/seed.ts

**Status: FIXED** — one-time generated/`SEED_PASSWORD`; OpenAPI examples generic.

### [A01] Catalog/request RBAC not on Nest API

**Status: FIXED** — `ServiceCatalogModule` + `ServiceRequestsController` + `request-store` RBAC.

### [A01] Incident stubs allow EndUser

**Status: FIXED** — `@Roles("Admin", "Agent")` only until reporter filters.

## Low / Hardening

| Finding | Status |
| --- | --- |
| RolesGuard fail-open without `@Roles` | **FIXED** — default-deny |
| JWT role not re-checked against DB | **FIXED** — live role from `users` |
| No security headers | **FIXED** — Helmet (+ HSTS in prod) |
| Password policy length-only | **FIXED** — complexity on seed/create |
| Changes mutate client mocks only | **FIXED** — `PATCH /changes/:id/status` Admin; mock after 2xx |
| Auth failures / unused audit_log | **FIXED** — `auth.login_failed` audit rows |

## Prior remediations (still hold)

| Item | Status |
| --- | --- |
| Dev B: mock users / `loginAsRole` DEV-only | Holds |
| Dev B: no production mock fallback | Holds |
| Dev B: HTTPS `VITE_SERVER_URL` in production | Holds |
| Dev D: Nest global JWT + Roles + Throttle guards | Holds |
| Dev D: bcrypt cost 12, refresh rotation, env secrets | Holds |
| Dev D: `cred.md` removed + gitignored | Holds |
| Dev D: Hono demo auth deleted | Holds |
| Dev A: catalog/request API RBAC on Nest | Holds |
| Dev C: client route RBAC + Nest role stubs | Holds |

## Out of scope (not open advisories)

- Staging/Render/Railway TLS and secret stores (ops, not in app tree)
- Dependency CVE scan of `pnpm-lock.yaml`
- Phase 2+ stub business logic (by design)

A03 (parameterized Drizzle + `ValidationPipe` whitelist), A08 (lockfile present), and A10 (no user-controlled URL fetch) had nothing to file.
