# Phase 3 audit — 2026-09-29

Scope: `Audit` after Dev-A/B/C/D Phase 3 merges (baseline `15f1d25` → HEAD). Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT, Socket.IO, BullMQ/Redis, Resend.

**Open findings: 2 Medium** (Dev A / Dev B). Dev D Low items closed. No Critical / High.

**Owners:** [Dev A](./Dev%20A/phase3.md) · [Dev B](./Dev%20B/phase3.md) · [Dev C](./Dev%20C/phase3.md) · [Dev D](./Dev%20D/phase3.md)

| Finding | Owner | Status |
| --- | --- | --- |
| PATCH assignee role check | Dev A | Open |
| `0003_*` migration renumber | Dev B (coord A/D) | Open |
| Duplicate assign email | Dev D remove send; Dev A keep | **Closed (Dev D)** |
| `/health/ready` probe strategy | Dev D | **Closed (Dev D)** |

## Medium

### [A01 / A04] PATCH assignee skips Agent/Admin role check — `apps/server/src/incidents/incidents.service.ts` (~343)

`POST /assign` validates assignee role is Agent|Admin. `PATCH` update only calls `assertUserExists`, so an Agent can assign an incident to an EndUser (or any user id).

**Fix:** Reuse the same role allowlist as `assign()` before writing `assignedTo`.

### [A08] Three migrations share `0003_` filename prefix — `apps/server/drizzle/migrations/` + `meta/_journal.json`

Merge kept `incident_workflow`, `sla_breached`, and `request_fulfillment` all as `0003_*.sql`. Journal idx order is correct, but fresh envs and humans will mis-order or double-apply.

**Fix:** Rename to `0003` / `0004` / `0005` with matching journal tags; document one-shot rename for existing DBs.

## Low / Hardening

### [A04] Auto-assign can enqueue ticket-assigned email twice — **Closed (Dev D)**

**Was:** Dev-D `AssignmentService` sent mail after claim; Dev-A `IncidentsService` sent again after `assign()`.

**Verified fix:** `AssignmentService` is selection + claim only (no `MailService`). Single enqueue remains in `IncidentsService.assign` after status write. See [Dev D/phase3.md](./Dev%20D/phase3.md).

### [A05] `/health/ready` is Admin-gated — **Closed (Dev D)**

**Decision:** Keep Admin `GET /health/ready`; orchestrators use a machine Admin JWT (or network policy). Public `/health` / `/health/live` stay liveness-only with no Redis/DB details. Documented in `health.controller.ts` + `apps/server/README.md`.

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

- [ ] PATCH assignee role parity with `POST /assign` before Checkpoint 3 sign-off *(Dev A)*
- [ ] Renumber drizzle `0003_*` trio and verify migrate on a clean DB *(Dev B)*
- [x] Pick one mail sender for auto-assign; re-run `mail.service.spec` *(Dev D — IncidentsService only)*
- [x] Decide k8s readiness strategy for `/health/ready` vs Admin gate *(Dev D — keep Admin + machine JWT)*
- [ ] Smoke: EndUser cannot approve SR, assign incident, or join foreign WS rooms
- [ ] Smoke: Agent cannot approve SR; Admin can; fulfillment blocked until Approved

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Infra outside the repo (WAF, managed Postgres/Redis ACLs)
- Runtime migration apply on every shared DB after renumber
