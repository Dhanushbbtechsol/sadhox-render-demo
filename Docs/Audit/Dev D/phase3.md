# Security Audit: Dev D (Phase 3)

Audit 2026-09-29. Combined: [phase3.md](../phase3.md).

## Low — Open

### [A04] Duplicate ticket-assigned email on auto-assign

**Where:** `apps/server/src/assignment/assignment.service.ts` (`assignNextAgent`)

**Bug:** You enqueue `sendTicketAssigned` after claim; Dev A `IncidentsService.assign` enqueues again. Two Resend jobs per auto-assign.

**Do:**
1. Remove mail send from `AssignmentService.assignNextAgent` (selection + claim only).
2. Leave enqueue to `IncidentsService.assign` (after status write).
3. Keep `MailModule` import only if something else in the module still needs it; otherwise drop the unused `MailService` inject.
4. Adjust specs that expected mail from `AssignmentService`.

Coordinate with Dev A so one side still sends.

### [A05] `/health/ready` is Admin-gated

**Where:** `apps/server/src/health/health.controller.ts:38`

**Context:** Phase 2 closed anonymous dependency leak by gating ready behind Admin. That still holds for disclosure. Orchestrators need a probe strategy.

**Do (pick one, document in comment or README):**
1. Keep Admin `GET /health/ready`; use a machine JWT / network policy for probes, **or**
2. Add a separate internal ready endpoint (e.g. bind only on private network / no public ingress) that returns Terminus checks without Admin role.

Do **not** put Redis/DB details back on public `GET /health` / `GET /health/live`.

## Not yours (except renumber assist)

- PATCH assignee role check → Dev A
- Migration `0003_*` renumber lead → Dev B (your file: `0003_incidents_sla_breached.sql` becomes `0004_…`)
