# Phase 1 reaudit — 2026-09-28

Scope: merged `Audit` tree after Dev A–D Phase 1. Stack: React/Vite + Zustand, NestJS (`apps/server` start = `main.ts`), Drizzle/Postgres, Passport JWT. Hono files still exist but are not the Nest start path.

## High

### [A07] Leftover Hono demo auth with hardcoded Admin password — apps/server/src/routes/auth.ts:19
`DEMO_USERS` still ships plaintext `"password"` for Admin, Agent, and EndUser. JWT secrets fall back to `dev-access-secret-change-me` / `dev-refresh-secret-change-me` (lines 43–44). `apps/server/src/index.ts` still mounts these routes and listens on port 3000.

Nest `pnpm dev` / `start` uses `main.ts`, not this file. The previous Dev D remediations claimed this entry was removed. It is still in `src/` and will be compiled. Anyone who runs `index.ts` gets Admin with `password`.

Fix: delete `apps/server/src/index.ts`, `apps/server/src/routes/auth.ts`, and unused Hono catalog wiring, or isolate them behind a non-compiled fixture that is not in the deploy artifact.

## Medium

### [A07] Login has no rate limit — apps/server/src/auth/auth.controller.ts:36
`POST /auth/login` is `@Public()` with no lockout or throttle. `@nestjs/throttler` is in `apps/server/package.json` and is never registered.

Fix: register `ThrottlerModule` and apply a tight limit on login/refresh (and fail closed on Redis if you add a store later).

### [A02] Access token stored in localStorage — apps/web/src/stores/auth-store.ts:152
Zustand `persist` (default `localStorage`) writes `accessToken`. Any XSS can steal a 15-minute Bearer token. Refresh is httpOnly (good); access is not.

Fix: keep access token in memory only. Rely on the refresh cookie for session restore.

### [A05] Swagger UI is public — apps/server/src/main.ts:34
`SwaggerModule.setup("docs", …)` has no auth gate and no `NODE_ENV` check. Staging/production would expose the full contract, including the seed password example on `LoginDto`.

Fix: mount `/docs` only when `NODE_ENV !== "production"`, or protect it behind an admin secret.

### [A07] Shared seed password advertised in OpenAPI — apps/server/scripts/seed.ts:17
Seed creates `admin@sadhox.local` / `agent@sadhox.local` with `ChangeMe123!`. `LoginDto` uses that string as the Swagger example (`apps/server/src/auth/dto/login.dto.ts:9`). Combined with public `/docs`, this is a known credential for any environment that ran seed and never rotated.

Fix: generate a one-time password at seed time and print it once; remove real passwords from `@ApiProperty` examples.

### [A01] Catalog/request RBAC is not on the Nest API — apps/server/src/service-requests/service-requests.controller.ts:9
The remediations described in Dev A (`allowedRoles`, reject client `requesterId`, EndUser sees own rows) live in unused Hono `apps/server/src/routes/catalog.ts` + `request-store.ts`. Nest only stubs `GET` and returns empty data / `{ id }`. Frontend `use-service-catalog.ts` still calls `/service-catalog` and `POST /service-requests`.

Fix: move catalog/request handlers onto Nest modules with the same checks, or stop calling those paths until they exist.

### [A01] Incident stubs allow EndUser on the API — apps/server/src/incidents/incidents.controller.ts:10
`GET /incidents` and `GET /incidents/:id` are `@Roles("Admin", "Agent", "EndUser")`. The web router blocks EndUser from `/incidents` (`apps/web/src/router.tsx`). Client checks are bypassable. Stubs return no records today; the role set will become IDOR the moment list/get return real rows without a reporter filter.

Fix: restrict list/get to Admin/Agent, or filter EndUser to `reporterId === jwt.sub` before shipping data.

## Low / Hardening

### [A01] RolesGuard is fail-open without `@Roles` — apps/server/src/common/guards/roles.guard.ts:30
Missing `@Roles()` means any authenticated user passes. Current controllers set roles. A forgotten decorator on a new handler is an authz hole.

Fix: default-deny: if no `@Roles` and not `@Public()`, reject.

### [A01] JWT role is not re-checked against the database — apps/server/src/auth/strategies/jwt.strategy.ts:23
`validate` trusts `payload.role` for 15 minutes after a role change.

Fix: load the user row (or a role version) in `validate` and reject revoked users.

### [A05] No security headers — apps/server/src/main.ts:9
No Helmet / CSP / `X-Frame-Options` / HSTS on the API.

Fix: add Helmet with a production HSTS policy.

### [A07] Password policy is length-only — apps/server/src/auth/dto/login.dto.ts:11
`MinLength(8)` only. Seed password is a known pattern.

Fix: enforce complexity on create/reset (login can stay length-only to avoid leaking policy).

### [A07] Changes still mutate client mocks — apps/web/src/hooks/use-changes.ts:3
`updateMockChangeStatus` is local state. Approval UI is not server-enforced.

Fix: call Nest `/changes` with Admin-only approve when that API exists.

### [A09] Auth failures and audit_log are unused
Login/refresh failures are not logged. `audit_log` exists in schema and is never written.

Fix: log failed login (email + IP, no password) and write authz denials to `audit_log`.

## Prior remediations

| Item | Status |
| --- | --- |
| Dev B: mock users / `loginAsRole` DEV-only | Holds (`auth-store.ts`) |
| Dev B: no production mock fallback | Holds |
| Dev B: HTTPS `VITE_SERVER_URL` in production | Holds (`packages/env/src/web.ts`) |
| Dev D: Nest global JWT + Roles guards | Holds (`app.module.ts`) |
| Dev D: bcrypt cost 12, refresh rotation, env secrets | Holds |
| Dev D: `cred.md` removed + gitignored | Holds |
| Dev D: Hono demo auth deleted | **Failed** — files still present |
| Dev A: catalog/request API RBAC | **Failed** — logic not on Nest start path |
| Dev C: client-only route RBAC | Still open; backend must enforce |

## Not checked / out of scope
- Staging/Render/Railway TLS and secret stores (not in repo)
- Dependency CVE scan of `pnpm-lock.yaml`
- Whether anyone still starts `src/index.ts` in a process manager
- Phase 2+ business logic that is still stubbed

A03 (parameterized Drizzle + `ValidationPipe` whitelist), A08 (lockfile present), and A10 (no user-controlled URL fetch) had nothing worth filing on this pass.
