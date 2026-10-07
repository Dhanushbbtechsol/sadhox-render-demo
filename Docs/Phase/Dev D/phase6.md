# Dev D — Phase 6: Projects Schema, Manager Role & ProjectAccessService

**Goal:** Backend foundation for projects/modules/members + `Manager` role + resource-level project ACL + scoped assignment + **Admin user management APIs**.  
**Prerequisite:** Phase 5 gaps closed (SLA rules API, etc.). **Do not rebuild KB.**  
**Design authority:** [../phase6.md](../phase6.md)  
**Status (2026-10-07):** Days 26–30 coding complete on `Dev-D`; Phase 6 audit Dev D items remediations verified; handoff [phase6-handoff.md](./phase6-handoff.md); staging migrate deferred.

---

- **Day 26: Schema + role**
  - Migration: `projects`, `project_members`, `modules`; nullable `project_id`/`module_id` on incidents, problems, service_requests, changes; add `Manager` to role enum.
  - Reject `project_members` for non-Agent in service; reject Manager as member.
  - Validate module belongs to project on ticket write.

- **Day 27: ProjectAccessService + projects APIs**
  - `canAccess` / `listAccessibleProjectIds` as in phase6.md.
  - CRUD: projects (Admin create; Manager read own; Admin manage members/modules as agreed — Admin owns org-wide project CRUD).
  - Wire JWT + `@Roles('Manager')` + seed Manager user.

- **Day 28: Assignment + approvals ACL**
  - Round-robin / manual assign: pool = `project_members` when `project_id` set; else global Agents.
  - SR/Change approve: `@Roles('Admin','Manager')` + Manager ownership; null project → Admin only.
  - Filter list endpoints by accessible projects (shared helper).

- **Day 29: Matrix + OpenAPI freeze**
  - Extend 401/403 matrix for Manager × own/other/null project across modules + approvals.
  - Freeze Swagger for A/B/C.

- **Day 30: Checkpoint**
  - Matrix green; hand off contract.
  - Staging/TL migrate: **deferred to production go-live** (2026-10-07) — not required to close Dev D Phase 6 coding.

- **User management (landed):**
  - `POST /admin/users` — create (`name`, `email`, `password`, `role`); hash password; unique email → 409.
  - `GET /admin/users/:id` — detail without hash.
  - `PATCH /admin/users/:id` — `name?`, `email?`, `password?`, `role?`; role→Manager clears `project_members` (same rule as `PATCH …/role`).
  - `PATCH …/role` kept for existing clients.
  - 401/403 matrix rows for list/create/get/patch users.
  - Contract: [contracts/phase6-openapi.md](../../contracts/phase6-openapi.md). UI: Dev C `/admin/users`.

## Consumers

| Surface | Who |
|---------|-----|
| Projects / members / modules APIs | Dev C UI; A/B ticket fields |
| ProjectAccess helpers | All ticket modules |
| Assignment pool change | Dev A UI |
| Approval role + project check | Dev B |
| Admin user CRUD | Dev C `/admin/users` UI |
