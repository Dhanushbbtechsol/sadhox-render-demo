# Security Audit: Dev B (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: SR/Change project scoping + Manager-alongside-Admin approvals.

## Phase 1 (do first)

### [A01 / A04] High — Create stamps any `projectId` — **FIXED**

`service-requests.service.ts` / `changes.service.ts` now call `ProjectsService.resolveTicketProjectFields` (same as incidents): non-EndUser → `assertCanAccess` before insert; EndUser existence-only for catalog submit.

Specs: `service-requests.create-acl.spec.ts`, `changes.service.spec.ts` (foreign project create).

## Phase 2

### Low — Catalog list Roles omit Manager — **FIXED**

`service-catalog.controller.ts` list `@Roles` includes `"Manager"`; RBAC matrix + web `/catalog` route/sidebar updated.

## Spot-checked (clean)

- `approve` / reject: `@Roles("Admin","Manager")` + `assertCanApprove` (null → Admin only)
- List/get scoped via `ticketProjectScope` / `assertCanAccessTicketProject`
- Approvals UI client filter is UX-only; server ACL holds
