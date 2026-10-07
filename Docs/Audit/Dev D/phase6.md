# Security Audit: Dev D (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: schema, `Manager` role, `ProjectAccessService`, projects APIs, assignment pool wiring, RBAC matrix.

Reaudit after remediation on `Dev-D` (2026-10-07).

## Phase 1 — Resolved

### [A01] High — Assignment agents IDOR — **FIXED**

`GET /assignment/agents?projectId=` calls `ProjectAccessService.assertCanAccess` before listing. Spec: `assignment.phase6.spec.ts`.

### [A01] Medium — EndUser project list leaks managers — **FIXED**

`ProjectsService.list` returns `{ id, name }` only for EndUser. Admin/Manager/Agent still get full rows (scoped).

### [A01] Medium — EndUser module list IDOR — **FIXED**

`listModules` for EndUser: project existence only + picker fields (`id`, `name`, `projectId`). Other roles still require `canAccess` via `getById`.

## Phase 2 — Resolved

### [A04] Medium — Extend resource ACL tests — **FIXED**

- `AssignmentController` in `rbac-matrix.spec.ts`
- `listAgents` ACL cases in `assignment.phase6.spec.ts`
- Manager approve × own/other/null already in `manager-project-acl.matrix.spec.ts`
- Assignment `@Roles` covered in manager ACL matrix

## Low — Resolved (coord)

### Catalog `GET` `@Roles` omit Manager — **FIXED**

`"Manager"` added to `ServiceCatalogController` list.

## Spot-checked (clean)

- `canAccess` / `assertCanAccess` / `assertCanApprove` semantics match Phase 6 decisions
- `assertUserIsAgentForMembership` on addMember
- Migration `0010_phase6_projects_manager` + role enum `Manager`
- Seed Manager password via `SEED_PASSWORD` / CSPRNG + bcrypt 12
