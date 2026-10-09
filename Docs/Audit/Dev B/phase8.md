# Security Audit: Dev B (Phase 8)

Reaudit 2026-10-08 at `75d8586`. Combined: [phase8.md](../phase8.md). **PASS** (Medium closed).

Approvals inbox filters match the chain (Manager: `Submitted` with a project; Admin: `PendingApproval` and unscoped `Submitted`). That filter is client-side on lists the server already scopes.

## Medium — Resolved

### [A04] Agent PATCH can set `PendingApproval` — **FIXED**

`ChangesService.update` now gates `PendingApproval` with `assertCanApprove` and `assertPendingApprovalAllowed` (Manager own-project, or Admin only when there is no manager step). Agent → 403. Covered by `changes.service.spec.ts`.
