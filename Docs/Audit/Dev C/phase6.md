# Security Audit: Dev C (Phase 6)

**Scope:** Admin project CRUD, Agent-only members, Manager home scoped on the server.  
**Status:** **CLEAN** for Dev C (2026-10-07). Combined: [phase6.md](../phase6.md).

Ticket list filters and Manager approvals are Dev A / Dev B / Dev D. They are not Dev C findings.

## Low — Resolved

### [A01] Project id existence oracle — **FIXED**

`assertCanRead` returns **404** when `ProjectAccessService.canAccess` is false. A Manager no longer gets 403 for another manager's project and 404 for a missing id.

## Spot-checked (clean)

- Project writes `@Roles("Admin")`; reads Admin + Manager with `canAccess` (`projects.manager_id`)
- `addMember` rejects non-Agent
- Project/module names use `sanitizePlainText` and `@MaxLength(255)`
- `/manager/dashboard/stats` and `/charts` scope to owned projects from the JWT
- `/admin/*` dashboard stays Admin-only
- Project hooks mock only via `useOfflineAdminData()`
- `GET /admin/users` is Admin-only and omits password hashes
- RBAC matrix covers project and manager dashboard routes

## Out of Dev C scope

- Incident / request / change lists filtered by project — Dev A / Dev B / Dev D
- Manager approvals — Dev B + Dev D
