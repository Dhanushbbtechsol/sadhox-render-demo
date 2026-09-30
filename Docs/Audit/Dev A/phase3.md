# Security Audit: Dev A (Phase 3)

Reaudit 2026-09-30. Combined: [phase3.md](../phase3.md). **CLEAN.**

## Medium — Resolved

### [A01 / A04] PATCH assignee skips Agent/Admin role check — **FIXED (verified)**

Shared `assertAssigneeIsAgentOrAdmin` on `assign()` and `update()`; EndUser assignee → 400 (`incidents.service.spec.ts`).

## Low — Resolved (coord)

### [A04] Duplicate ticket-assigned email — **FIXED (verified)**

Mail enqueue kept in `IncidentsService.assign` after status write. Dev D removed send from `AssignmentService`.
