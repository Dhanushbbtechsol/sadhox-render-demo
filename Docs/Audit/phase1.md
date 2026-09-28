# Phase 1 reaudit — 2026-09-28 (post Dev-A-/C/D merge)

Scope: current `Audit` tree. Stack: React/Vite + Zustand, NestJS (`apps/server` `main.ts`), Drizzle/Postgres, Passport JWT.

**High / Medium: none open.** Low items below were fixed in source.

## Low / Hardening

### [A02] Session user still written to localStorage — apps/web/src/stores/auth-store.ts
**Status: Fixed.** Persist only `isAuthenticated`. Restore user/token via `POST /auth/refresh` before `isHydrated`.

### [A07] Login timing differs when the email does not exist — apps/server/src/auth/auth.service.ts
**Status: Fixed.** Unknown emails still run `bcrypt.compare` against `MISSING_USER_HASH`.

### [A07] Rate limits are in-process only — apps/server/src/app.module.ts
**Status: Fixed.** Shared `throttle_hits` table on `DATABASE_URL` (`PostgresThrottlerStorage`). No extra Redis client.

### [A09] Login audit IP trusts `X-Forwarded-For` — apps/server/src/auth/auth.controller.ts
**Status: Fixed.** Production `trust proxy` hop count 1; login records `req.ip` only.

## Verified remediations (still hold)

| Item | Evidence |
| --- | --- |
| Hono demo auth gone | No `src/index.ts` / `src/routes/auth.ts` |
| Nest JWT + Roles default-deny + Throttler | `app.module.ts` |
| Login 5/min, refresh 10/min | `auth.controller.ts` |
| Access token not in persist | `auth-store.ts` partialize |
| Swagger off in production | `main.ts` `if (!isProd)` |
| Seed password generated / OpenAPI generic | `scripts/seed.ts`, `login.dto.ts` |
| Catalog/request RBAC + reject requester override | Nest controllers + `request-store` |
| Incidents/problems Agent+Admin; assets Admin | controllers `@Roles` |
| Helmet + HSTS in production | `main.ts` |
| JWT role from DB | `jwt.strategy.ts` |
| bcrypt 12, refresh rotation | `auth.service.ts` |
| Failed login → logger + `audit_log` | `recordAuthFailure` |
| DEV-only mock users / `loginAsRole` | `auth-store.ts`, `login.tsx` |
| HTTPS `VITE_SERVER_URL` in production | `packages/env/src/web.ts` |
| `cred.md` gitignored | `.gitignore` |
| Change status PATCH Admin-only | `changes.controller.ts` |

Client `ProtectedRoute` is still UI-only. Nest stubs now match those roles (`assets` is Admin-only). That is expected, not a new hole.

## Not checked / out of scope
- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Service-request rows live in process memory (`request-store.ts`) until Phase 2 persists them
- Admin UI still paints `features/admin/mocks.ts` until assets/audit APIs return real rows
- Unused `apps/web/src/lib/api-client.ts` (`setSession` is not on the store; nothing imports this file)

A03 (Drizzle + `ValidationPipe` whitelist), A08 (lockfile present), A10 (no user-controlled URL fetch): nothing to file.
