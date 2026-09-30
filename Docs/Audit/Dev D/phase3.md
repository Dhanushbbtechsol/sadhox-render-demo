# Security Audit: Dev D (Phase 3)

Audit 2026-09-29. Combined: [phase3.md](../phase3.md).

## Low — Closed

### [A04] Duplicate ticket-assigned email on auto-assign — **Fixed**

**Where:** `apps/server/src/assignment/assignment.service.ts` (`assignNextAgent`)

**Fix applied:**
1. Removed `sendTicketAssigned` from `AssignmentService.assignNextAgent` (selection + claim only).
2. Enqueue remains in `IncidentsService.assign` after status write.
3. Dropped unused `MailModule` / `MailService` from `AssignmentModule`.
4. Specs updated (no mail mock on `AssignmentService`).

### [A05] `/health/ready` is Admin-gated — **Documented**

**Where:** `apps/server/src/health/health.controller.ts`

**Decision (option 1):** Keep Admin `GET /health/ready`. Orchestrators probe with a machine Admin JWT (or network policy). Anonymous `/health` and `/health/live` stay liveness-only with no Redis/DB details. Documented in controller comment + `apps/server/README.md`.

## Not yours (except renumber assist)

- PATCH assignee role check → Dev A
- Migration `0003_*` renumber lead → Dev B (your file: `0003_incidents_sla_breached.sql` becomes `0004_…`)
