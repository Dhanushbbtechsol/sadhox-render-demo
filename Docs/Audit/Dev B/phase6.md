# Security Audit: Dev B (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: SR/Change project scoping + Manager-alongside-Admin approvals.

## Phase 1 (do first)

### [A01 / A04] High — Create stamps any `projectId`

`service-requests.service.ts` / `changes.service.ts` call `resolveProjectModule` (existence only). Non-EndUser can attach foreign projects.

**Fix:** reuse `resolveTicketProjectFields` / `assertCanAccess` for Agent (and Manager on SR create) before insert.

## Phase 2

### Low — Catalog list Roles omit Manager

`service-catalog.controller.ts` list `@Roles("Admin", "Agent", "EndUser")` while SR create allows Manager.

**Fix:** add `"Manager"` to catalog list if product needs it.

## Spot-checked (clean)

- `approve` / reject: `@Roles("Admin","Manager")` + `assertCanApprove` (null → Admin only)
- List/get scoped via `ticketProjectScope` / `assertCanAccessTicketProject`
- Approvals UI client filter is UX-only; server ACL holds
