# Security Audit: Dev C (Phase 6)

**Scope:** Admin project CRUD, Agent-only members, Manager home scoped on the server.  
**Status:** **CLEAN** for Dev C (2026-10-07). Combined: [phase6.md](../phase6.md). Owner: Admin project CRUD UI + Manager home.

**Status:** UI is on `Dev-C` (Admin `/admin/projects`, Manager `/manager` KPIs and charts). Project HTTP contract follows Dev D after the merge: list/get roles include Agent and EndUser pickers; `getById` returns **403** when the project exists but the caller cannot access it, and **404** when it is missing (`projects.service.spec.ts`).

## Spot-checked (clean)

- Project writes `@Roles("Admin")`
- `addMember` rejects non-Agent (`ProjectScopeService`)
- Project/module names use `sanitizePlainText` and `@MaxLength(255)`
- `/manager/dashboard/stats` and `/charts` scope to owned projects from the JWT
- `/admin/*` dashboard stays Admin-only
- Project hooks mock only via `useOfflineAdminData()`
- `GET /admin/users` is Admin-only and omits password hashes

## Out of Dev C scope

- Incident / request / change lists filtered by project — Dev A / Dev B / Dev D
- Manager approvals — Dev B + Dev D
