# Dev C — Phase 6 QA

**Scope:** Admin project CRUD, Agent-only members, modules, Manager home scoped by API.  
**Status:** Code-verified 2026-10-07 on `Dev-C`. Live smoke needs Nest + migration `0010_phase6_projects_manager` + seeded Manager.

---

## Admin projects (`/admin/projects`)

- [x] Sidebar **Projects** is Admin-only; Manager uses **Home** (`/manager`), not this route.
- [x] List loads `{ data }` from `GET /projects` (mock only with offline token).
- [x] Create sets name + optional Manager (`POST /projects`) and opens the project.
- [x] Overview can change name and Manager (`PATCH /projects/:id`).
- [x] Delete project is Admin (`DELETE /projects/:id`).

## Members

- [x] Picker lists `GET /admin/users?role=Agent` only.
- [x] Copy states Managers are not members.
- [x] Add calls `POST /projects/:id/members`; server rejects non-Agent.
- [x] Remove calls `DELETE /projects/:id/members/:userId`.

## Modules

- [x] Create / rename / delete under `/admin/projects/:id/modules`.

## Manager home (`/manager`)

- [x] Route and sidebar gated to `Manager`.
- [x] KPIs from `GET /manager/dashboard/stats` (owned projects on the server).
- [x] Volume + SLA from `GET /manager/dashboard/charts?range=` — not a filtered copy of `/admin/dashboard`.
- [x] Range buttons `7d` / `30d` / `ytd`.

## Live smoke (human)

1. Apply migration `0010` and seed (Morgan Manager).
2. Admin: create project, assign Manager, add an Agent, reject adding the Manager user (API 400).
3. Sign in as Manager: home shows only owned-project KPIs/charts; `/admin/projects` is not in the nav and the route guard blocks it.
4. Agent/EndUser do not see Projects or Manager home.
