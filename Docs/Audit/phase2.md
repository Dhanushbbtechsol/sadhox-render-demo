# Phase 2 audit — 2026-09-29

Scope: `Audit` after Dev-A / Dev-B / Dev-C / Dev-D merges. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT, Socket.IO, BullMQ/Redis, Resend.

No `.review.yml` in repo — review defaults from the sonar skill apply (severity medium+, no auto-post).

**Mitigation owners (open):** [Dev A](./Dev%20A/phase2.md) · [Dev B](./Dev%20B/phase2.md) · [Dev C](./Dev%20C/phase2.md) · [Dev D](./Dev%20D/phase2.md)

## High

### [A01 / A04] Agent can schedule a change without Admin approval — `changes.service.ts` + `approval-policy.ts` — **FIXED (Dev B)**

Mitigation: Admin-only for `Approved`/`Scheduled`; `Submitted → Scheduled` removed from transitions. See [Dev B/phase2.md](./Dev%20B/phase2.md).

## Medium

### [A05] WebSocket CORS reads `process.env.CORS_ORIGIN` at decorator time — `events.gateway.ts:41`

HTTP CORS uses `ConfigService` after env validation. The gateway decorator uses `process.env.CORS_ORIGIN` when the class is imported — before `ConfigModule.forRoot` may populate env. Mis-set / empty origin can weaken or break Socket.IO CORS relative to the HTTP app.

Fix: pass CORS origin via a factory / `IoAdapter` that reads `ConfigService` after bootstrap (same source as `main.ts`).

### [A08] Two migrations share a `0001_` prefix — `drizzle/migrations/` — **FIXED (Dev B)**

Catalog migration renamed to `0002_phase2_catalog_approvals`; journal updated. See `apps/server/drizzle/migrations/RENAME_0002_NOTE.md`.

## Low / Hardening

### [A01] EndUser WS room join — `events.gateway.ts` `assertCanJoinTicketRoom` — **Fixed (Dev A)**

EndUser may join when the ticket is an incident they reported or a service request they submitted; Admin/Agent unrestricted; others default-deny.

### [A09] Failed mutating requests (non-401/403) are not written to `audit_log` — `audit-log.interceptor.ts`

Success-only audit is intentional; auth denials are skipped. Validation / business failures on mutations leave no durable trail. Optional: log `action` + status code without body for 4xx of interest.

### [A05] Public `/health` exposes Redis / queue up-down — `health.controller.ts`

Useful for ops; enables probing of internal deps from the internet if the API is public. Prefer authenticated or network-restricted readiness, or a separate internal probe path.

### Dead Phase 1 in-memory catalog path — **Fixed (Dev A)**

Deleted unused `request-store.ts` / `catalog.items.ts` / `catalog.types.ts`. Live path is DB catalog/requests. Optional: Dev B can add `allowedRoles` on seed + list filter if restricted items are needed.

## Verified (Phase 2 additions that look sound)

| Area | Evidence |
| --- | --- |
| Incident IDOR for EndUser | `incidents.service.ts` `assertCanRead` / list filters on `reporterId` |
| Service-request IDOR + approve Admin | `service-requests.service.ts` + `@Roles("Admin")` on approve/reject |
| Requester override rejected | `RejectRequesterOverridePipe` on create |
| Assets Admin-only | `ASSET_ADMIN_ROLES` |
| Admin dashboard Admin-only | `admin.controller.ts` `@Roles("Admin")` |
| JWT role from DB | `jwt.strategy.ts` |
| WS auth + token expiry disconnect | `events.gateway.ts` + `ws-auth.util.ts` |
| Login throttle + shared store | `auth.controller.ts`, `PostgresThrottlerStorage` |
| Helmet / Swagger off in prod | `main.ts` |
| Audit body redaction | `redact-audit.ts`, pino redact paths |
| Email HTML escaped | `html-escape.ts` in processor |
| Prod HTTPS client URL | `packages/env/src/web.ts` |

A03 (Drizzle + ValidationPipe whitelist), A06 (lockfile present — no CVE scan run), A10 (no user-controlled URL fetch): nothing to file.

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE / `pnpm audit`
- Render / CI secret injection correctness outside this repo
- Runtime migration apply on a live DB (journal only reviewed)
- Whether BullMQ job payloads are ever attacker-controlled beyond authenticated API enqueue paths
