# Dev A — Phase 6: Project-Scoped Incidents & Problems

**Goal:** Wire `project_id` / `module_id` on Incidents & Problems; lists respect ProjectAccess; assignment UI uses project member pool.  
**Prerequisite:** Dev D contract Days 26–28. **Do not rebuild KB** — only reuse existing ticket↔article UI.  
**Design:** [../phase6.md](../phase6.md)

**Status:** implemented (2026-10-07) — foundation + Dev A surfaces landed together so A could ship without waiting on a separate D merge.

---

- **Day 26–27:** Types/hooks for project + module; create/edit forms pick project then module (module must belong to project). ✅
- **Day 28:** List/detail filtered by API (Manager/Agent scope). Round-robin + manual assignee pickers use project members when project set; show global pool only for null-project tickets (Admin). ✅
- **Day 29:** RBAC walkthrough — Manager sees own project tickets only; Agent only member projects; EndUser unchanged. ✅ (matrix + notes below)
- **Day 30:** Fix edge cases; hand QA notes. ✅

---

## What shipped (Dev A + required foundation)

### Backend
- Migration `0010_phase6_projects_manager`: `projects`, `project_members`, `modules`; `Manager` role; nullable `project_id`/`module_id` on incidents, problems, service_requests, changes
- `ProjectAccessService` + `ProjectsModule` (`GET/POST /projects`, modules, members)
- Incidents/Problems list/get/create/update scoped by project access; Manager on `@Roles`
- Assignment: `GET /assignment/agents?projectId=` + auto-assign pool = project members when ticket has a project

### Frontend
- `useProjects` / `useProjectModules`; create incident + create problem dialogs with project→module cascade
- `useAgents(projectId)` + IncidentActions pool messaging
- Router/sidebar: Manager can open `/incidents` and `/problems`
- Seed: `manager@sadhox.local`, project **Core Platform** (Alice as member, module **API**); open showcase incidents attached

---

## QA walkthrough (Day 29–30)

| Actor | Expect |
|-------|--------|
| Admin | Sees all projects + null-project tickets; create without project still allowed |
| Manager (`manager@`) | Incidents/Problems only for projects they manage; 403 on other/null project detail |
| Agent (`agent@`) | Only member projects (Core Platform); assignee picker = project members |
| EndUser | Unchanged — own tickets only; no project nav; create without project |

### Edge cases checked in code
- Module without project → 400
- Module from wrong project → 400
- Non-Agent cannot be project member (service rejects)
- Manager cannot be project member
- Auto-assign on project ticket with no members → 503
- Unscoped ticket assign still uses global Agent (+ Admin) pool

### Manual checklist
1. Migrate: apply `0010_phase6_projects_manager`, re-seed
2. Login Manager → incidents list non-empty (showcase open tickets on Core Platform)
3. Login Agent → same; assign picker shows Alice only for project tickets
4. Login Admin → create incident with “No project”; Agent cannot open it
5. Create problem with project+module; appears for Manager/Agent of that project
6. Portal EndUser create/list still own-only

---

## Out of Dev A (still Dev B / C)
- SR/Change project fields + Manager approve ACL (B)
- Admin project CRUD UI + Manager dashboard filters (C)
