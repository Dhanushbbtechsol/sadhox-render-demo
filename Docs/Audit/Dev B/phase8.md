# Security Audit: Dev B (Phase 8)

Audit 2026-10-08. Combined: [phase8.md](../phase8.md). **FAIL.**

Approvals inbox filters match the chain (Manager: `Submitted` with a project; Admin: `PendingApproval` and unscoped `Submitted`). That filter is client-side on lists the server already scopes.

## Medium — Open

### [A04] Agent PATCH can set `PendingApproval`

`CHANGE_ALLOWED_TRANSITIONS` allows `Submitted` → `PendingApproval`. `ChangesService.update` does not apply the Manager/Admin chain to that status, so an Agent who can view the change skips the Manager step.

**Fix:** gate `PendingApproval` with `assertCanApprove` and `projectRequiresManagerStep`, same as approve. Agent → 403.
