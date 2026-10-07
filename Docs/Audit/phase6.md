# Phase 6 audit — 2026-10-07

Scope: Projects / `Manager` / resource ACL on `Audit` (committed Dev A + foundation + uncommitted Dev B SR/Change scoping). Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings: 0 Critical · 0 High · 0 Medium · 0 Low** (Dev D closed; Dev A CLEAN; Dev B High and catalog Low closed).  
**Status:** Phase 6 in progress on `Dev-C`. Admin project UI and Manager home are on this branch. Dev D Phase 6 audit remediations are included.  
**Dev A:** CLEAN (pass 2, 2026-10-07) — see [Dev A/phase6.md](./Dev%20A/phase6.md).  
**Dev B:** High + catalog Low closed — see [Dev B/phase6.md](./Dev%20B/phase6.md).

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## High

### [A01] Assignment pool IDOR — Dev D — **FIXED**

`listAgents(user, projectId)` → `assertCanAccess` when `projectId` set. Specs in `assignment.phase6.spec.ts`.

### [A01 / A04] SR / Change create stamps any `projectId` — Dev B — **FIXED**

Was: `resolveProjectModule` existence-only. Now: `ProjectsService.resolveTicketProjectFields` on SR/Change create (non-EndUser → `assertCanAccess`). See [Dev B/phase6.md](./Dev%20B/phase6.md).

## Medium

### [A01] EndUser project list exposes managers — Dev D — **FIXED**

EndUser `GET /projects` returns `{ id, name }` only.

### [A01] EndUser module list IDOR — Dev D — **FIXED**

EndUser `listModules` returns picker fields after project-exists check; other roles still access-scoped.

### [A04] RBAC matrix ≠ resource ACL — Dev D — **FIXED**

`AssignmentController` in RBAC matrix; Manager approve × own/other/null + `listAgents` ACL specs.

## Low / Hardening

| Item | Owner | Fix |
| --- | --- | --- |
| Manager missing from catalog `GET` `@Roles` | B/D | **FIXED** — `"Manager"` on catalog list + web route |
| DEV mock Manager password `"password"` | web | Already `import.meta.env.DEV`-gated — keep it |

## Dev A — Resolved (pass 2)

| Finding | Fix |
| --- | --- |
| Problems assignee pool | `assertAssigneeInPool` + `AssignmentService.isInPool` |
| Cross-project incident link/snippets | `assertCanLinkIncidents` + filtered snippets |
| Manager/Agent null `projectId` | `assertMayStampUnscoped` (Admin/EndUser only) + UI hide |
| Incident project-move assignee | Always re-check pool against `nextProjectId` |
| Manager link UI | `LinkToProblem` includes Manager |

## Still sound (spot-checked)

- `assertCanApprove`: Manager own-project only; null project → Admin only
- Ticket list/get scope: Manager owned projects; Agent members + null; EndUser ownership
- `addMember` rejects non-Agent; Managers not in `project_members`
- Incidents/problems: project stamp + assignee pool + project-move recheck
- Unscoped create/clear: Admin/EndUser only
- Drizzle parameterized; no user-driven `exec` in Phase 6 deltas
- Seed Manager uses generated/SEED_PASSWORD + bcrypt 12 (not a fixed weak default)

## Dev C (landed on this branch)

- Admin `/admin/projects` CRUD (members + modules)
- Manager home KPIs and server-scoped charts (`GET /manager/dashboard/stats` and `/charts`)

## Review checklist (Sonar)

1. Manager approve other project / null project → 403; own → 200.
2. Agent `GET /assignment/agents?projectId=<foreign>` → 403.
3. Agent create SR/Change with foreign `projectId` → 403.
4. Problem assign non-member on project ticket → 400.
5. Link foreign incident to accessible problem → 403/400; snippets do not leak.
6. Manager create/clear `projectId: null` → 400.
7. Incident project move with non-member assignee → 400.
8. EndUser `GET /projects` does not return manager identities.
9. Smoke: Manager cannot appear as `project_members` worker.

## Not checked / out of scope

- Full Playwright Phase 6 walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
