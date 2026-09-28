# Security Audit: Dev D (Phase 1)

Reaudit 2026-09-28: Nest remediations verified in source. Combined report: [phase1.md](../phase1.md).

Scope: NestJS API in `apps/server` (Passport JWT, Drizzle, RBAC stubs).

## Checklist (verified FIXED)

| ID | Finding | Status |
| --- | --- | --- |
| A01 | Missing global auth | **FIXED** — `JwtAuthGuard` + `RolesGuard` (default-deny) + `ThrottlerGuard` |
| A01 | Hono demo auth | **FIXED** — `src/index.ts` / Hono routes deleted |
| A01 | RolesGuard fail-open | **FIXED** — requires `@Roles` unless `@Public()` |
| A01 | JWT role not vs DB | **FIXED** — `JwtStrategy.validate` loads the user row |
| A01 | Incident stubs EndUser | **FIXED** — Admin/Agent only |
| A01 | Catalog/request RBAC | **FIXED** — Nest + `request-store` |
| A05 | DB URL / secrets | **FIXED** — env + Zod; `.env` gitignored |
| A05 | Public Swagger in production | **FIXED** — `/docs` only when not production |
| A05 | Missing security headers | **FIXED** — Helmet; HSTS in production |
| A07 | Login rate limit | **FIXED** — 5/min login, 10/min refresh; shared `throttle_hits` |
| A07 | Seed / OpenAPI password | **FIXED** — generated seed; generic examples |
| A07 | Auth failures unused | **FIXED** — `auth.login_failed` audit rows |
| A07 | Password policy | **FIXED** — `password-policy.ts` on seed/create |
| — | `cred.md` | **FIXED** — gitignored |

## Out of scope
- Staging TLS and cloud secrets
- Full lockfile CVE audit
- Phase 2 persistence of service requests
