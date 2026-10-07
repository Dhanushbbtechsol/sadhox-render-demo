# Dev D — Phase 6 handoff (for Devs A / B / C)

**Date:** 2026-10-07  
**Owner:** Dev D  
**Scope:** Projects / modules / members, `Manager` role, `ProjectAccessService`, scoped assignment, Manager-alongside-Admin approvals, list project filters.  
**Day 30 checkpoint:** local green.  
**Staging / TL migrate:** deferred to **production go-live** (explicit decision 2026-10-07) — not an open Dev D Phase 6 coding gap.

Consume the contract against **local** Nest + Postgres until go-live migrate.

---

## OpenAPI / Swagger

**Frozen Phase 6 path/role contract:** [Docs/contracts/phase6-openapi.md](../../contracts/phase6-openapi.md)

When Nest runs with `NODE_ENV !== production`, Swagger UI is at:

- **UI:** `http://localhost:3000/docs` (or your `PORT`)
- **Generated from:** Nest decorators on controllers under `apps/server/src/**`

DTO field shapes follow the live Swagger document; path/method/role freeze is the markdown contract above.

---

## Projects / members / modules

**Module:** `apps/server/src/projects/`  
**Base path:** `/projects`

| Method | Path | Roles |
| --- | --- | --- |
| `POST` | `/projects` | Admin — body `{ name, managerId }` (`managerId` must be role Manager) |
| `GET` | `/projects` | Admin (all full); Manager/Agent (accessible full); EndUser (`{ id, name }` picker only) |
| `GET` | `/projects/:id` | Admin, Manager, Agent (access-checked) |
| `PATCH` / `DELETE` | `/projects/:id` | Admin |
| Members / modules | under `/projects/:id/...` | Admin writes; Admin+Manager+Agent read members; EndUser may list modules as picker fields |

`project_members` accepts **Agent** users only (service validation). Managers supervise via `projects.manager_id`, not membership.

---

## ProjectAccess helpers

**Service:** `ProjectAccessService` (`canAccess` / `assertCanAccess`, `listAccessibleProjectIds`, `canApprove` / `assertCanApprove`)  
**List SQL helper:** `buildTicketProjectListFilter`  
**Module validation:** `ProjectScopeService.resolveTicketProjectScope`

| Helper | Rule |
| --- | --- |
| `canAccess` | Admin always; Manager via `manager_id`; Agent via `project_members`; paths OR'd (defense-in-depth) |
| `canApprove` | Admin always; Manager **ownership only** (`manager_id`); `projectId = null` → Admin-only |
| List filter | Admin: all; Manager: accessible ids (no null); Agent: accessible **or** null; EndUser: own tickets |

---

## Assignment pool

**Service:** `AssignmentService.assignNextAgent` / `listAgents`  
- Ticket **with** `projectId` → eligible pool = that project's `project_members` (Agents)  
- Ticket **without** → global Agent pool (unchanged least-loaded + advisory lock)  
- `GET /assignment/agents?projectId=` for UI pool preview — **requires** `assertCanAccess` when `projectId` is set (Admin/Agent/Manager)

---

## Approvals (Admin + Manager)

| Path | Roles | Extra check |
| --- | --- | --- |
| `PATCH /service-requests/:id/approve` | Admin, Manager | `assertCanApprove(user, ticket.projectId)` |
| `PATCH /service-requests/:id/reject` | Admin, Manager | same |
| `PATCH /changes/:id/approve` | Admin, Manager | same |

---

## Admin role update (promotion cleanup)

| Path | Roles | Notes |
| --- | --- | --- |
| `PATCH /admin/users/:id/role` | Admin | body `{ role }`. **Promoting to Manager deletes that user's `project_members` in the same DB transaction.** |

Seed Manager (idempotent): `manager@sadhox.local`.

---

## Ticket fields for A / B

Optional on create/update: `projectId`, `moduleId` (module must belong to project). Nullable = global scope.

---

## Consumer map (quick)

| Dev | Surfaces |
| --- | --- |
| **A** | Incident/Problem `projectId`/`moduleId` + scoped lists; assignment UI uses `?projectId=` / project pool |
| **B** | Request/Change project fields; Manager-alongside-Admin approve UX |
| **C** | Admin project CRUD; Manager home/scoped dashboard filters; role gates |

---

## Day 30 checkpoint (2026-10-07)

| Check | Result |
| --- | --- |
| Local `/health` | **200** `{ "status": "ok" }` |
| Local `/health/live` | **200** |
| Local `/health/ready` (no auth) | **401** (expected) |
| `check-types` / `lint` | pass |
| Full vitest | **50** files / **549** tests pass |
| RBAC matrix + Manager project ACL matrix | green (incl. own/other/null + approvals) |
| Local migration journal | **10** rows; `0010_phase6_projects_manager` applied; `Manager` in enum |
| TL `192.168.68.111:5437` (PG) | **unreachable** — migrate **not** attempted |
| TL `:16379` (Redis) | reachable |
| TL `:22` (SSH) | **unreachable** |
| Staging / TL Phase 6 migrate | **Deferred to production go-live** (2026-10-07) — not attempted; TL PG/SSH were also unreachable at checkpoint |

### Phase 5 live verification flag (mail job-ID / colon fix)

`buildEmailJobId` (no colons) is in code and covered by unit tests. **Live verification on the TL host was never confirmed** in this track — TL Redis/SSH/PG have been intermittently or currently unreachable, and Day 30 did not re-run mail against TL. Treat Phase 5 TL mail verification as **unconfirmed**, not done.

---

## Ready vs blocked

**Ready for A/B/C against local:**

- Projects/members/modules APIs + OpenAPI freeze  
- `ProjectAccess` / list filter / approval ownership helpers  
- Assignment pool change + optional `projectId` on agent list  
- Manager role + seed user + promotion cleanup endpoint  
- Local schema through `0010`

**Deferred to production go-live (not Phase 6 code blockers):**

- Apply `0010_phase6_projects_manager` (and remaining Phase 5 ops) on staging/TL/prod  
- Phase 5 mail job-ID live verify on TL Redis/worker (**unconfirmed**)  
- Full cutover checklist (`Docs/Phase/Dev D/go-live-checklist.md`)

---

## Explicitly out of scope this phase

- Multi-level approvals  
- Rebuilding Knowledge Base  
- `users.manager_id` org chart  
- Manager as assignee via membership  
- Staging/TL migrate before production go-live (deferred by decision)  

**Phase plan:** [phase6.md](./phase6.md) · **Design:** [../phase6.md](../phase6.md)
