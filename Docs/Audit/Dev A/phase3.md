# Security Audit: Dev A (Phase 3)

Audit 2026-09-29. Combined: [phase3.md](../phase3.md).

## Medium — Open

### [A01 / A04] PATCH assignee skips Agent/Admin role check

**Where:** `apps/server/src/incidents/incidents.service.ts` (`update`, ~343)

**Bug:** `POST /assign` checks assignee is Agent|Admin. `PATCH` only calls `assertUserExists`, so an Agent can set `assignedTo` to an EndUser (or any user id).

**Do:**
1. When `dto.assignedTo` is set, load the user and require `role === "Agent" || role === "Admin"` (same as `assign()`).
2. Reject others with `BadRequestException("Assignee must be an Agent or Admin")`.
3. Add/extend a unit or controller spec: PATCH with EndUser id → 400.

## Low — Coordinate with Dev D

### [A04] Duplicate ticket-assigned email on auto-assign

**Where:** `incidents.service.ts` `assign()` (keep mail here)

**Do:** Keep the enqueue in `IncidentsService.assign` after the status write. Dev D removes the send from `AssignmentService` so only one job fires.

## Not yours

- Migration `0003_*` renumber → Dev B
- `/health/ready` probe strategy → Dev D
