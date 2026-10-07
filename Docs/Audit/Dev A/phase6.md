# Security Audit: Dev A (Phase 6)

Reaudit 2026-10-07 (pass 2). Combined: [phase6.md](../phase6.md). Owner: Incidents/Problems project scoping + assignment UI pool.

**CLEAN** — assigned High/Medium/Low closed in source.

## Phase 1 — Resolved

### [A01] High — Problems assignee ignores project pool — **FIXED**

`ProblemsService` injects `AssignmentService`; create/update call `assertAssigneeInPool` (mirrors incidents). Update re-validates existing assignee when project changes.

### [A01] High — Cross-project incident link + metadata disclosure — **FIXED**

`assertCanLinkIncidents` → `assertCanViewTicket` per incident on create/update/`linkIncident`. `loadIncidentSnippets` omits incidents the actor cannot view (IDs + metadata).

### [A01] High — Manager/Agent can create or clear to `projectId = null` — **FIXED**

`resolveTicketProjectFields` → `assertMayStampUnscoped`: only Admin/EndUser. UI hides “No project” for Manager/Agent (`project-module-fields.tsx`).

## Phase 2 — Resolved

### [A04] Medium — Incident project move keeps out-of-pool assignee — **FIXED**

`IncidentsService.update` always pool-checks `nextAssignee` against `nextProjectId` (not only when `dto.assignedTo` is sent). Problems share the same pattern.

### Low — Manager link-incident UI vs `@Roles` — **FIXED**

`LinkToProblem` `canLink` includes Manager (aligned with `POST /problems/:id/incidents/:incidentId`).

## Spot-checked (clean)

- Incident create with non-null `projectId`: `resolveTicketProjectFields` + `assertCanAccess` for non-EndUser
- Incident assign / PATCH assignee: `assertAssigneeInPool` + `isInPool` (Managers excluded from project pool)
- Incident/problem list: `ticketProjectScope`
- Incident/problem get: `assertCanAccessTicketProject` / `assertCanViewTicket`
- Manager on incident/problem `@Roles` + router/sidebar
- Module ∈ project enforced in `resolveTicketProjectFields`
- Assignee UI: `useAgents(projectId)` + server assign (trust server, not picker)
- Auto-assign loads ticket `projectId` for pool (`AssignmentService.assignNextAgent`)

## Out of Dev A

- `GET /assignment/agents?projectId=` IDOR → Dev D
- SR/Change foreign `projectId` → Dev B
- Admin project CRUD UI / Manager dashboard → Dev C
