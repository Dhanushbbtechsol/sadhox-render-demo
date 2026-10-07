# Security Audit: Dev D (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: schema, `Manager` role, `ProjectAccessService`, projects APIs, assignment pool wiring, RBAC matrix.

## Phase 1 (do first)

### [A01] High — Assignment agents IDOR

`GET /assignment/agents?projectId=` has no `assertCanAccess`.

**Fix:** inject `ProjectAccessService`; assert before listing.

### [A01] Medium — EndUser project list leaks managers

`ProjectsService.list` returns `managerId` / `managerName` for EndUser pickers.

**Fix:** redacted picker DTO (`id`, `name` only).

### [A01] Medium — EndUser module list IDOR

`listModules` skips access check for EndUser.

**Fix:** same scoping/redaction as attachable projects.

## Phase 2

### [A04] Medium — Extend resource ACL tests

Add Manager × own/other/null approve + list cases; cover assignment agents ACL.

## Spot-checked (clean)

- `canAccess` / `assertCanApprove` / `ticketProjectScope` semantics match Phase 6 decisions
- `assertAgentMember` / `assertUserRole(..., "Agent")` on addMember
- Migration `0010_phase6_projects_manager` + role enum `Manager`
- Seed Manager password via `SEED_PASSWORD` / CSPRNG + bcrypt 12
