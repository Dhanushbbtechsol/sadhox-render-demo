# Security Audit: Dev D (Phase 9)

Reaudit remediation 2026-10-10. Combined: [phase9.md](../phase9.md). **PASS / CLEAN.**

`/approve` and `/reject` follow `reports_to_id` then Admin. Org chart, escalation, notifications, the desk report (throttled), and asset history match the phase notes.

## Medium — Resolved

### [A01] Manager can read a service request outside their team — **FIXED**

`ServiceRequestsService.get` requires `requesterReportsToId === actor`. No project fallback. Comments / KB links for service requests use the same Manager gate.

### [A04] Reject uses the project gate after the org-chart gate — **FIXED**

`reject` uses `nextApproval` then sets `Rejected`. `resolveRejectTransition` is not called.

### [A04] Change PATCH still uses the project manager — **FIXED**

`ChangesService` approval paths use `reports_to_id` + `nextApproval` (see Dev A).

## Low — Resolved

### [A04] Manager desk report is not throttled — **FIXED**

`GET /manager/reports/desk` shares `THROTTLE_DESK_REPORT` (10/min) with the Admin desk report.
