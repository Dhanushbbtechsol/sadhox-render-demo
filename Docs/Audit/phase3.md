# Phase 3 audit — 2026-09-29

Scope: `Audit` after Dev-A/B/C/D Phase 3 merges (baseline `15f1d25` → HEAD). Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT, Socket.IO, BullMQ/Redis, Resend.

**Open findings: 1 Medium, 2 Low.** No Critical / High. (`0003_*` renumber closed by Dev B.)

**Owners:** [Dev A](./Dev%20A/phase3.md) · [Dev B](./Dev%20B/phase3.md) · [Dev C](./Dev%20C/phase3.md) · [Dev D](./Dev%20D/phase3.md)

| Finding | Owner |
| --- | --- |
| PATCH assignee role check | Dev A |
| `0003_*` migration renumber | **Dev B — FIXED** (`0003`/`0004`/`0005` + `RENAME_0003_NOTE.md`) |
| Duplicate assign email | Dev D remove send; Dev A keep |
| `/health/ready` probe strategy | Dev D |

## Medium

### [A01 / A04] PATCH assignee skips Agent/Admin role check — `apps/server/src/incidents/incidents.service.ts` (~343)

`POST /assign` validates assignee role is Agent|Admin. `PATCH` update only calls `assertUserExists`, so an Agent can assign an incident to an EndUser (or any user id).

**Fix:** Reuse the same role allowlist as `assign()` before writing `assignedTo`.

### [A08] Three migrations share `0003_` filename prefix — **FIXED (Dev B)**

Renumbered to `0003_phase3_incident_workflow` → `0004_incidents_sla_breached` → `0005_phase3_request_fulfillment`. See `RENAME_0003_NOTE.md`.

## Low / Hardening

### [A04] Auto-assign can enqueue ticket-assigned email twice — `assignment.service.ts` + `incidents.service.ts` `assign()`

Dev-D `AssignmentService` sends mail after claim; Dev-A `IncidentsService` sends again after assign(). Duplicate Resend jobs / noise.

**Fix:** Send from one place only (prefer `IncidentsService` after status write).

### [A05] `/health/ready` is Admin-gated — `apps/server/src/health/health.controller.ts:38`

Good against anonymous Redis/DB disclosure, but orchestrator probes need unauthenticated readiness or a separate internal route.

**Fix:** Keep public `/health/live`; add network-restricted ready, or probe with a machine credential.

## Still sound (spot-checked)

| Control | Status |
| --- | --- |
| A01 RBAC default-deny + matrix tests | Holds |
| A01 EndUser incident / comment / WS room ACL | Holds |
| A01 Admin routes `@Roles("Admin")` | Holds |
| A02 Secrets via env; audit redaction | Holds |
| A03 Drizzle parameterized queries | Holds |
| A07 Login throttle 5/min + Postgres storage | Holds |
| A05 Helmet CSP/HSTS + Swagger off in prod | Holds |
| A05 CORS fail-closed (no `*`) | Holds |
| A04 Resolution notes + fulfillment gates | Holds |
| A10 No user-supplied URL fetch in Phase 3 | Holds |

## Review checklist

- [ ] PATCH assignee role parity with `POST /assign` before Checkpoint 3 sign-off
- [x] Renumber drizzle `0003_*` trio and verify migrate on a clean DB
- [ ] Pick one mail sender for auto-assign; re-run `mail.service.spec`
- [ ] Decide k8s readiness strategy for `/health/ready` vs Admin gate
- [ ] Smoke: EndUser cannot approve SR, assign incident, or join foreign WS rooms
- [ ] Smoke: Agent cannot approve SR; Admin can; fulfillment blocked until Approved

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Infra outside the repo (WAF, managed Postgres/Redis ACLs)
- Runtime migration apply on every shared DB after renumber
