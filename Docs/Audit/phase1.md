# Phase 1 reaudit — 2026-09-28 (post Dev-A-/C/D merge)

Scope: current `Audit` tree. Stack: React/Vite + Zustand, NestJS (`apps/server` `main.ts`), Drizzle/Postgres, Passport JWT.

**High / Medium: none open.** Prior Phase 1 remediations were checked in source, not taken from docs.

## Low / Hardening

### [A02] Session user still written to localStorage — apps/web/src/stores/auth-store.ts:157
`partialize` no longer stores `accessToken` (good). It still persists `user` (email, name, role) and `isAuthenticated`. XSS or a shared browser can read that profile. API access still needs the httpOnly refresh cookie.

Fix: persist nothing, or only a boolean; restore the session with `POST /auth/refresh` only.

### [A07] Login timing differs when the email does not exist — apps/server/src/auth/auth.service.ts:35
Missing users throw before `bcrypt.compare`. An attacker can tell valid emails from response time.

Fix: run `bcrypt.compare` against a dummy hash when no row is found.

### [A07] Rate limits are in-process only — apps/server/src/app.module.ts:24
`ThrottlerModule.forRoot` has no Redis store. `REDIS_URL` is optional in env and unused. Extra instances each get their own 5/min login budget.

Fix: use a shared throttler store when `REDIS_URL` is set.

### [A09] Login audit IP trusts `X-Forwarded-For` — apps/server/src/auth/auth.controller.ts:37
`clientIp` uses the first `X-Forwarded-For` hop with no trusted-proxy check. Clients can put any IP in that header; `audit_log` records it.

Fix: set Express `trust proxy` to the known hop count and use `req.ip` only.

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
