# Phase 3 reaudit — 2026-09-30

Scope: current `Audit` tree after Dev-A/B/C/D Phase 3 audit fixes merged. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT, Socket.IO, BullMQ/Redis, Resend.

**Open findings: none.** Medium / Low from this phase are closed in source.

**Owners:** [Dev A](./Dev%20A/phase3.md) · [Dev B](./Dev%20B/phase3.md) · [Dev C](./Dev%20C/phase3.md) · [Dev D](./Dev%20D/phase3.md)

## Verified remediations

| Item | Evidence |
| --- | --- |
| PATCH assignee role = Agent\|Admin | `assertAssigneeIsAgentOrAdmin` on `assign()` + `update()`; `incidents.service.spec.ts` |
| Migration `0003_*` renumber | Journal tags `0003`→`0005`; tracked SQL only those three; `RENAME_0003_NOTE.md` |
| Single ticket-assigned email on auto-assign | `AssignmentService` no `MailService`; enqueue only in `IncidentsService.assign` |
| `/health/ready` probe strategy | Admin-gated + machine JWT documented in `health.controller.ts` + `apps/server/README.md` |

## Still sound (spot-checked)

RBAC default-deny + matrix tests, EndUser incident/comment/WS room ACL, admin `@Roles("Admin")`, login 5/min + Postgres throttle storage, helmet + Swagger off in prod, CORS fail-closed, audit redaction, resolution notes + fulfillment gates, secrets via env.

A03 / A06 / A10: nothing to file.

## Optional follow-on (not findings)

- [ ] Smoke: EndUser cannot approve SR, assign incident, or join foreign WS rooms
- [ ] Smoke: Agent cannot approve SR; Admin can; fulfillment blocked until Approved

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Runtime migration apply on every shared DB (see `RENAME_0003_NOTE.md`)
- Infra outside the repo (WAF, managed Postgres/Redis ACLs)
