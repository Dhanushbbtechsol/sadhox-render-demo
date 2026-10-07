# Phase 6 API contract freeze (Dev D → Devs A / B / C)

**Frozen:** 2026-10-07  
**Runtime Swagger UI:** `http://localhost:3000/docs` (`NODE_ENV !== production`)  
**Handoff narrative:** [Docs/Phase/Dev D/phase6-handoff.md](../Phase/Dev%20D/phase6-handoff.md)  
**Design authority:** [Docs/Phase/phase6.md](../Phase/phase6.md)

This document freezes the Phase 6 surfaces for client wiring. Request/response field details follow Nest DTO + Swagger schemas; do not invent alternate paths.

## AuthZ summary

| Role | Project access | Approvals | Assignment pool |
| --- | --- | --- | --- |
| Admin | all | all (including `projectId = null`) | global Agents when ticket has no project |
| Manager | `projects.manager_id = self` | only projects they own; **null project → Admin-only** | n/a (Managers are not assignees) |
| Agent | `project_members` rows | no | ticket `projectId` set → that project's members; else global Agents |
| EndUser | n/a (own tickets) | no | n/a |

## Projects (`/projects`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/projects` | Admin | body: `name`, `managerId` (must be role Manager) |
| GET | `/projects` | Admin, Manager | Admin: all; Manager: accessible/own |
| GET | `/projects/:id` | Admin, Manager | Manager requires access |
| PATCH | `/projects/:id` | Admin | `name?`, `managerId?` |
| DELETE | `/projects/:id` | Admin | |
| GET | `/projects/:id/members` | Admin, Manager | |
| POST | `/projects/:id/members` | Admin | body `{ userId }` — **Agent only** |
| DELETE | `/projects/:id/members/:userId` | Admin | |
| GET | `/projects/:id/modules` | Admin, Manager | |
| POST | `/projects/:id/modules` | Admin | body `{ name }` |
| PATCH | `/projects/:id/modules/:moduleId` | Admin | body `{ name }` |
| DELETE | `/projects/:id/modules/:moduleId` | Admin | |

## Admin user role (`/admin`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| PATCH | `/admin/users/:id/role` | Admin | body `{ role }` ∈ Admin\|Agent\|EndUser\|Manager. **Promoting to Manager deletes that user's `project_members` rows in the same transaction.** |

## Ticket project/module fields

On create/update for **incidents**, **problems**, **service-requests**, **changes**:

| Field | Type | Notes |
| --- | --- | --- |
| `projectId` | uuid \| null | optional; null = global scope |
| `moduleId` | uuid \| null | optional; when set, must belong to `projectId` |

## List scoping

| Endpoint | Roles (list) | Scope |
| --- | --- | --- |
| `GET /incidents` | Admin, Agent, EndUser, Manager | EndUser: own; Admin: all; Manager: accessible projects only; Agent: accessible **or** `projectId` null |
| `GET /problems` | Admin, Agent, Manager | same Agent/Manager rules |
| `GET /service-requests` | Admin, Agent, EndUser, Manager | EndUser: own; else as above |
| `GET /changes` | Admin, Agent, Manager | as above |

Shared helper: `buildTicketProjectListFilter` + `ProjectAccessService.listAccessibleProjectIds`.

## Approvals

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| PATCH | `/service-requests/:id/approve` | Admin, Manager | Manager must **own** ticket project (`manager_id`); null project → Admin only |
| PATCH | `/service-requests/:id/reject` | Admin, Manager | same ownership check |
| PATCH | `/changes/:id/approve` | Admin, Manager | same ownership check |

## Assignment (`/assignment`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/assignment/agents` | Admin, Agent | query `projectId?` — when set, pool = project_members Agents only |
| (internal) | `assignNextAgent(ticketId)` | — | reads incident `projectId`; scoped pool vs global Agents |

## Helpers for consumers

| Helper | Location | Use |
| --- | --- | --- |
| `ProjectAccessService.canAccess` | `apps/server/src/projects/project-access.service.ts` | resource ACL (OR of manager_id + membership) |
| `ProjectAccessService.canApprove` / `assertCanApprove` | same | approval ownership (manager_id only) |
| `listAccessibleProjectIds` | same | list filters |
| `buildTicketProjectListFilter` | `apps/server/src/projects/project-list-scope.ts` | SQL predicate for ticket lists |

## Explicitly not frozen / out of scope

- Multi-level approval chains  
- Rebuilding Knowledge Base  
- Org-chart `users.manager_id`  
- Manager as ticket assignee via membership  
- Staging/TL migrate without explicit go-ahead (Day 30)
