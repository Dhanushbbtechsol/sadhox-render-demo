# Security Audit: Dev D (Phase 1)

**Reverified: 2026-09-28**  
**Result: CLEAN — 0 open findings, 0 advisories**

Scope: NestJS API in `apps/server` (Passport JWT, Drizzle, RBAC stubs).

## Checklist (all FIXED)

| ID | Finding | Status |
| --- | --- | --- |
| A01 | Missing global auth / public-by-default Nest scaffold | **FIXED** — `JwtAuthGuard` + `RolesGuard` (default-deny) + `ThrottlerGuard` as `APP_GUARD` |
| A01 | Hono demo auth / public entry | **FIXED** — `src/index.ts`, `src/routes/auth.ts`, `src/routes/catalog.ts` deleted |
| A01 | RolesGuard fail-open without `@Roles` | **FIXED** — denies unless `@Public()` or `@Roles(...)` |
| A01 | JWT role not re-checked vs DB | **FIXED** — `JwtStrategy.validate` loads live user/role |
| A01 | Incident stubs allow EndUser | **FIXED** — Admin/Agent only until reporter filters |
| A01 | Catalog/request RBAC on Nest | **FIXED** — catalog + service-requests with role filtering |
| A05 | DB connection string / secrets | **FIXED** — env + Zod only; `.env` gitignored; no `packages/db` |
| A05 | Public Swagger in production | **FIXED** — `/docs` only when `NODE_ENV !== "production"` |
| A05 | Missing security headers | **FIXED** — Helmet; HSTS in production |
| A07 | Login rate limit | **FIXED** — login 5/min, refresh 10/min |
| A07 | Seed / OpenAPI shared password | **FIXED** — one-time generated seed password; generic OpenAPI examples |
| A07 | Auth failures unused | **FIXED** — `auth.login_failed` → logger + `audit_log` |
| A07 | Password policy | **FIXED** — complexity on seed/create (`password-policy.ts`) |
| — | `cred.md` secrets in repo | **FIXED** — untracked + gitignored |

## Evidence (runtime entry)

- Entry: `apps/server/src/main.ts` only (Nest)
- Guards: `apps/server/src/app.module.ts`
- Auth: `apps/server/src/auth/*`
- Verify: `pnpm --filter server check-types` and `pnpm --filter server test` pass

## Out of scope (not advisories)

- Staging/Render TLS and cloud secret stores
- Full `pnpm-lock.yaml` CVE audit
- Phase 2+ business logic still stubbed by design
