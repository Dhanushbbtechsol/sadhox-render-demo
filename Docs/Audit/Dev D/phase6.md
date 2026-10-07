# Security Audit: Dev D (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: schema, `Manager` role, `ProjectAccessService`, projects APIs, assignment pool wiring, RBAC matrix.

**CLEAN** — assigned High/Medium closed in source (2026-10-07). Reaudit after remediation on `Dev-D` (2026-10-07).

## Phase 1 — Resolved

### [A01] High — Assignment agents IDOR — **FIXED**

`GET /assignment/agents?projectId=` calls `ProjectAccessService.assertCanAccess` before listing. Spec: `assignment.phase6.spec.ts`.

### [A01] Medium — EndUser project list leaks managers — **FIXED**

`ProjectsService.list` returns picker DTO (`id`, `name` only) for EndUser. Admin/Manager/Agent still get full rows (scoped). Spec: `projects.service.spec.ts`.

### [A01] Medium — EndUser module list IDOR — **FIXED**

`listModules` for EndUser: project existence only + picker fields (`id`, `name`, `projectId`); no manager/createdAt leak. Other roles still require `canAccess` via `getById`. Spec: `projects.service.spec.ts`.

## Phase 2 — Resolved

### [A04] Medium — Extend resource ACL tests — **FIXED**

- `manager-project-acl.matrix.spec.ts`: Manager × own/other/null for `canAccess` / `assertCanApprove` / list filters; Assignment `@Roles`
- `rbac-matrix.spec.ts`: `AssignmentController` + `GET /assignment/agents`
- `assignment.phase6.spec.ts`: agents ACL (assert / skip when no projectId / 403)

## Low — Resolved (coord)

### Catalog `GET` `@Roles` omit Manager — **FIXED**

`"Manager"` added to `ServiceCatalogController` list.

## Spot-checked (clean)

- `canAccess` / `assertCanAccess` / `assertCanApprove` / ticket list filter semantics match Phase 6 decisions
- `assertUserIsAgentForMembership` / `assertAgentMember` / `assertUserRole(..., "Agent")` on addMember
- Migration `0010_phase6_projects_manager` + role enum `Manager`
- Seed Manager password via `SEED_PASSWORD` / CSPRNG + bcrypt 12
- Web `useProjects` / `useProjectModules` unwrap `{ data }` envelope
