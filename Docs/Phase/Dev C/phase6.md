# Dev C — Phase 6: Projects Admin UI, Manager Views & User Management

**Status:** Projects + Manager home implemented on `Dev-C` (2026-10-07). QA: [phase6-qa.md](./phase6-qa.md). **Admin User Management UI — still open** (pickers only via `GET /admin/users?role=`).  
**Goal:** Admin UI for projects / members / modules; Manager navigation + dashboard charts scoped to owned projects; **Admin `/admin/users` CRUD UI**.  
**Design:** [../phase6.md](../phase6.md)

**Day 26 gate:** Satisfied. SLA rules API live; Knowledge Admin hooks unwrap `{ data }`; mocks only via `useOfflineAdminData()`.

**API contract (Checkpoint 6):** `origin/Dev-D` did not publish projects routes. Dev C ships against the Nest contract in `apps/server/src/projects/` (server-side `ProjectAccessService`; UI does not hide global admin data).

| Method | Path | Roles |
| --- | --- | --- |
| `GET` / `POST` | `/projects` | list Admin+Manager; create Admin |
| `GET` / `PATCH` / `DELETE` | `/projects/:id` | get Admin+Manager; mutate Admin |
| `GET` / `POST` | `/projects/:id/members` | list Admin+Manager; add Admin (Agent only) |
| `DELETE` | `/projects/:id/members/:userId` | Admin |
| `GET` / `POST` | `/projects/:id/modules` | list Admin+Manager; create Admin |
| `PATCH` / `DELETE` | `/projects/:id/modules/:moduleId` | Admin |
| `GET` | `/admin/users?role=Agent\|Manager` | Admin pickers (landed) |
| `POST` / `GET` / `PATCH` | `/admin/users`, `/admin/users/:id` | **User management — open** (Dev D API + this UI) |
| `GET` | `/manager/dashboard/stats` | Manager — owned-project KPIs |
| `GET` | `/manager/dashboard/charts?range=7d\|30d\|ytd` | Manager — volume + SLA, server-scoped |

Lists return `{ data }`. Live hooks fail loudly; mocks only with a DEV mock access token.

---

- **Day 26 (gate):** Done — Phase 5 Medium items closed before this UI.
- **Day 27–28:** Admin `/admin/projects` CRUD (name, assign Manager, members = Agents only, modules). UI picker is Agents only; `ProjectsService.addMember` rejects non-Agents.
- **Day 29:** Manager `/manager` home. Sidebar entry is Manager-only. Charts call `/manager/dashboard/charts` (owned `projects.manager_id`), not a client filter of `/admin/dashboard`.
- **Day 30:** Walkthrough notes in [phase6-qa.md](./phase6-qa.md).
- **User management (open):** After Dev D ships create/get/patch users:
  - Admin route `/admin/users` — table (name, email, role), create + edit dialogs (set/reset password on create/edit).
  - Sidebar under Admin. Fail loudly on API errors (no silent mocks).
  - Promoting to Manager: rely on server clearing `project_members`; refresh project member UIs if open.

## Routes

| Path | Role |
| --- | --- |
| `/admin/projects` | Admin list + create |
| `/admin/projects/:id` | Admin overview (name, manager) |
| `/admin/projects/:id/members` | Admin Agent members |
| `/admin/projects/:id/modules` | Admin modules |
| `/admin/users` | **Admin user management (open)** |
| `/manager` | Manager home (KPIs + charts) |

## Out of scope

- Ticket project/module fields — Dev A / Dev B
- Manager approval inbox — Dev B
- Knowledge Base rebuild
- `users.manager_id`; Manager as `project_members`
- Manager-facing user admin; soft-delete / `is_active`
