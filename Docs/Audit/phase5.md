# Phase 5 reaudit — 2026-10-07 (pass 2)

Scope: current `Audit` tree after Phase 5 remediations + Admin Knowledge hook fixes on working tree. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings (Phase 5): 0 Critical · 0 High · 0 Medium · 1 Low**  
**Phase 4 carryovers still open (Dev D): 1 Medium · 3 Low** (LAN High closed).

**Owners:** [Dev A](./Dev%20A/phase5.md) · [Dev B](./Dev%20B/phase5.md) · [Dev C](./Dev%20C/phase5.md) · [Dev D](./Dev%20D/phase5.md)

## Verified remediations

| Item | Evidence |
| --- | --- |
| Admin SLA rules API | `GET`/`PATCH /admin/sla-rules` (+ `/:priority`); RBAC + `admin.sla-rules.spec.ts` |
| Catalog sanitize + options bounds | `ServiceCatalogService` + `CatalogFormFieldDto` `@ArrayMaxSize(50)` / `@MaxLength(128, { each: true })` |
| Hardcoded LAN script defaults | `requireEnv` in probe/clean/rebaseline |
| Admin Knowledge `{ data }` unwrap | `unwrapKnowledgeList` in `features/admin/hooks.ts` (categories + articles) |
| Knowledge/SLA silent DEV mock on API error | Knowledge/SLA live paths no longer `catch → mocks`; mocks only via `useOfflineAdminData()` |

## Low / Hardening — still open (Dev C)

### [A04 / A07] Residual DEV `catch → mock` on other Admin surfaces

`features/admin/hooks.ts` still returns mocks on live API failure for assets list, dashboard stats/charts, audit logs, and queues when `import.meta.env.DEV` (outside `useOfflineAdminData()`).

**Fix:** same rule as Knowledge — rethrow unless offline mock token.

## Still open from Phase 4 — Dev D (carryover)

| Sev | Item | Status |
| --- | --- | --- |
| High | Hardcoded LAN DB/Redis defaults in scripts | **FIXED** |
| Medium | `SameSite=None` refresh cookie without CSRF | **Still open** |
| Low | Cap `THROTTLE_GLOBAL_LIMIT` in production | **Still open** |
| Low | Throttle `/auth/logout` like refresh | **Still open** |
| Low | Skip expected WS auth denials in Sentry | **Still open** |

## Still sound (spot-checked)

Knowledge Draft visibility; Published-only links; EndUser ticket ACL on links; portal `readOnly`; catalog Admin writes; SLA Admin-only; markdown preview text nodes; Drizzle parameterized search; RBAC matrix covers Knowledge + catalog + SLA.

## Review checklist (human)

1. Admin Knowledge list loads against Nest `{ data }` envelope (live JWT, not mock token).
2. Kill Nest / force API error → Admin Knowledge/SLA fail loudly (no silent mock success).
3. Admin SLA PATCH persists and is used by breach jobs.
4. Probe scripts fail without `DATABASE_URL` / `REDIS_URL`.

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Live Render/Vercel cutover
- Full Playwright Phase 5 walkthrough
