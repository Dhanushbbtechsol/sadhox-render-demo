# Security Audit: Dev A (Phase 3)

Audit 2026-09-29. Combined: [phase3.md](../phase3.md).

## Medium — Resolved

### [A01 / A04] PATCH assignee skips Agent/Admin role check — **FIXED**

**Where:** `apps/server/src/incidents/incidents.service.ts` (`update`)

**Was:** `POST /assign` checked assignee is Agent|Admin. `PATCH` only called `assertUserExists`, so an Agent could set `assignedTo` to an EndUser.

**Fix:**
- Shared `assertAssigneeIsAgentOrAdmin` used by both `assign()` and `update()`.
- Rejects non-Agent/Admin with `BadRequestException("Assignee must be an Agent or Admin")`.
- Spec: `incidents.service.spec.ts` — PATCH with EndUser id → 400.

## Low — Coordinate with Dev D

### [A04] Duplicate ticket-assigned email on auto-assign — **Dev A side done**

**Where:** `incidents.service.ts` `assign()` (mail enqueue kept after status write)

Dev D still removes the send from `AssignmentService` so only one job fires.

## Not yours

- Migration `0003_*` renumber → Dev B
- `/health/ready` probe strategy → Dev D
