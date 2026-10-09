# Security Audit: Dev D (Phase 9)

Audit 2026-10-09. Combined: [phase9.md](../phase9.md). **FAIL.**

`/approve` and `/reject` follow `reports_to_id` then Admin. Org chart, escalation, notifications, the desk report, and asset history match the phase notes.

## Medium — Open

### [A04] Change PATCH still uses the project manager

`ChangesService.update` gates `PendingApproval`, `Approved`, and `Rolled Back` with `assertCanApprove` and `projectRequiresManagerStep`. An Admin can final-approve a `Submitted` change that has no project manager even when the creator has a manager. A project manager can set `PendingApproval` without being `reports_to_id`.

**Fix:** use the same `reports_to_id` check as `approve` and `reject` for those statuses.
