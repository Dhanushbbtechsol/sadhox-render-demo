# Security Audit: Dev D (Phase 9)

Audit 2026-10-09. Combined: [phase9.md](../phase9.md). **PASS** (Medium closed).

`/approve` and `/reject` follow `reports_to_id` then Admin. Org chart, escalation, notifications, the desk report, and asset history match the phase notes.

## Medium — Resolved

### [A04] Change PATCH still uses the project manager — **FIXED**

`ChangesService.update` gated `PendingApproval`, `Approved`, and `Rolled Back` with `assertCanApprove` / `projectRequiresManagerStep`. Those three statuses now use the same `reports_to_id` + `nextApproval` path as `approve` / `reject` (`resolveOrgApprovalActor`). Project-manager helpers are not used for them.
