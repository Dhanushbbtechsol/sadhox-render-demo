# Phase 6 — Projects, Modules & Manager Role

**Status:** in progress — Dev A + shared foundation landed (2026-10-07); Dev B / Dev C tracks still open  

**Prerequisite:** close Phase 5 open gaps first (`Docs/Audit/phase5.md`) — SLA rules API, Admin Knowledge `{ data }` unwrap, kill silent DEV mock write fallbacks. **Do not rebuild Knowledge Base.**

**Decisions locked (2026-10-07):**

| Question | Answer |
|----------|--------|
| What is “Employee”? | **Agent** — no new role besides `Manager` |
| Who approves SRs / Changes? | **Admin and Manager** (alongside), still **single-level**. Manager must own the ticket’s project. `project_id = null` → **Admin-only** |
| Can Manager also be a `project_members` worker? | **No** — Managers supervise; Agents work tickets |
| `users.manager_id`? | **Dropped** — project ownership is only `projects.manager_id`; multi-project Agents would drift under a single user FK |

---

## Hierarchy

```
Admin    → global; users, projects, org settings
Manager  → projects where projects.manager_id = self; approve/see only those
Agent    → works tickets; sees only projects in project_members
EndUser  → unchanged (own tickets)
```

---

## Schema (Drizzle)

| Table / change | Notes |
|----------------|--------|
| `projects` | `id`, `name`, `manager_id → users`, `created_at` |
| `project_members` | `(project_id, user_id)` PK; service rejects non-`Agent` inserts |
| `modules` | `id`, `project_id`, `name` |
| tickets | nullable `project_id`, `module_id` on **incidents, problems, service_requests, changes**; validate module ∈ project |
| roles | enum add `Manager` |
| ~~`users.manager_id`~~ | not added |

Optional later: project-scoped Knowledge — **out of this phase unless explicitly pulled in**.

---

## AuthZ (guards alone are not enough)

1. Add `Manager` to role enum, JWT claims, `@Roles`, seed users, frontend role types/routes.
2. **`ProjectAccessService.canAccess(user, projectId)`**
   - Admin → always  
   - Manager → `projects.manager_id = user.id`  
   - Agent → row in `project_members`  
   - EndUser → N/A for project lists; keep own-ticket rules  
3. List queries filter by accessible `project_id`s (plus EndUser ownership).
4. Approvals: `@Roles('Admin','Manager')` **and** Manager project-ownership check. Null `project_id` → Admin only.
5. Extend **401/403 matrix**: Manager × (own project / other project / null project) for every module + approval route.

---

## Assignment

- Ticket **with** `project_id`: round-robin / manual assignee pool = that project’s `project_members` only.
- Ticket **without** `project_id`: keep today’s **global** Agent pool.

---

## Track ownership (Days 26–30 sketch)

| Dev | Focus | Plan |
|-----|--------|------|
| **D** | Schema/migration, `Manager` role + JWT, `ProjectAccessService`, projects/members/modules APIs, assignment pool, approval ACL, 401/403 matrix, seed | [Dev D/phase6.md](./Dev%20D/phase6.md) |
| **A** | Incident/Problem create/list/detail: project/module fields + scoped lists; assignment UI uses project pool | [Dev A/phase6.md](./Dev%20A/phase6.md) |
| **B** | Request/Change project/module + Manager-alongside-Admin approve | [Dev B/phase6.md](./Dev%20B/phase6.md) |
| **C** | Admin project CRUD UI; Manager home/scoped dashboard filters; role gates | [Dev C/phase6.md](./Dev%20C/phase6.md) |

---

## Explicitly out of scope this phase

- Multi-level approval chains  
- Rebuilding Knowledge Base  
- Org-chart / HR `users.manager_id`  
- Manager acting as ticket assignee via membership  
