# Checkpoint 3 — Phase 3 (Dev D)

**Date:** 2026-09-29  
**Source of truth:** [phase3.md](./phase3.md)

## Days 11–15 vs `phase3.md`

| Day | Requirement | Evidence |
| --- | --- | --- |
| 11 | `AssignmentService.assignNextAgent(ticketId, category)` least-loaded + concurrency tests; exposed to IncidentsModule | `assignment/*`, `IncidentsModule` imports `AssignmentModule` |
| 12 | SLA BullMQ every 5 min; flag `sla_breached`; audit; email-queue | `queues/sla.*`, migration `0004_incidents_sla_breached` |
| 13 | Auto-close Resolved ≥ 3 days; audit; Socket.io | `queues/ticket-lifecycle.*`, `AUTO_CLOSE_*` env |
| 14 | Login 5/min; global 100/min; `/health/live` + `/health/ready` (Terminus DB+Redis) | `throttle.constants`, `health/*` |
| 15 | Email: incident assignment, service approvals, **asset notifications** | `MailService` + hooks in Assignment / ServiceRequests / Changes / Assets |
| 15 | Supertest RBAC matrix on core endpoints | `common/rbac-matrix.spec.ts` (91 cases) |

## Email triggers (Day 15)

| Track | Trigger | Job kind |
| --- | --- | --- |
| Dev A | `assignNextAgent` → agent | `email.ticket-assigned` |
| Dev B | SR approve/reject; change approve / Rolled Back | `email.approval-outcome` |
| Dev C | Asset owner assign; asset ticket link | `email.asset-notification` |

Templates remain placeholders until Dev C delivers production HTML (`Docs/Phase/Dev C/phase3.md` Day 12).

## Verification

- `pnpm check-types` / `pnpm lint` / `pnpm test` green in `apps/server`
- Local + remote migration journals aligned (`0000`…`0005`)

## Explicit non-goals / carry-forward (not blocking phase3.md code)

1. Agent **availability / shift** filtering — not in phase3.md; Phase 4 backlog.
2. **Staging environment choice** (Railway/Render vs Docker host) — ops decision; code path (workers, email queue, throttles, health) is ready once staging URL/Redis/Postgres are pointed.
