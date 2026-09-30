# Phase 2 reaudit — 2026-09-29

Scope: current `Audit` tree. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT, Socket.IO, BullMQ/Redis, Resend.

**Open findings: none.** High / Medium / Low from this phase are closed in source.

**Owners:** [Dev A](./Dev%20A/phase2.md) · [Dev B](./Dev%20B/phase2.md) · [Dev C](./Dev%20C/phase2.md) · [Dev D](./Dev%20D/phase2.md)

## Verified remediations

| Item | Evidence |
| --- | --- |
| Agent cannot skip change approval | `requiresAdminForChangeStatus`; no `Submitted → Scheduled` |
| Catalog migration unique index | `0002_phase2_catalog_approvals.sql` + journal |
| WS CORS via ConfigService | `CorsIoAdapter` + `sharedCorsOptions` in `main.ts` |
| EndUser WS room ownership | `assertCanJoinTicketRoom` on reporter / requester |
| Dead in-memory catalog path | `request-store` / `catalog.items` / `catalog.types` deleted |
| Failed mutation audit (400/409) | `audit-log.interceptor.ts` status-only trail, no body |
| Public health dependency leak | `GET /health` liveness only; `GET /health/ready` Admin |

## Still sound (spot-checked)

Incident / service-request IDOR, requester override pipe, assets + admin `@Roles("Admin")`, JWT role from DB, login throttle, helmet + Swagger off in prod, audit redaction, email HTML escape, prod HTTPS `VITE_SERVER_URL`.

A03 / A06 / A10: nothing to file.

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Runtime migration apply on every shared DB (see `RENAME_0002_NOTE.md`)
- BullMQ payload attacker control beyond authenticated enqueue
