# Phase 6 audit — 2026-10-07

Scope: Projects / `Manager` / resource ACL on `Audit`. Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings: 0 Critical · 0 High · 0 Medium · 0 Low** (Dev D Phase 6 closed).  
**Status:** Dev A / B / C / D Phase 6 security findings **CLEAN**. Product gaps (Admin User Management CRUD, go-live) remain in [STATUS.md](../STATUS.md) — not security findings here.  
**Dev A:** CLEAN — see [Dev A/phase6.md](./Dev%20A/phase6.md).  
**Dev B:** CLEAN — see [Dev B/phase6.md](./Dev%20B/phase6.md).  
**Dev C:** CLEAN — see [Dev C/phase6.md](./Dev%20C/phase6.md).  
**Dev D:** CLEAN — see [Dev D/phase6.md](./Dev%20D/phase6.md).

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## High — Resolved

### [A01] Assignment pool IDOR — Dev D — **FIXED**

`listAgents(user, projectId)` → `assertCanAccess` when `projectId` set. Spec: `assignment.phase6.spec.ts`.

### [A01 / A04] SR / Change create stamps any `projectId` — Dev B — **FIXED**

`ProjectsService.resolveTicketProjectFields` on SR/Change create. See [Dev B/phase6.md](./Dev%20B/phase6.md).

## Medium — Resolved

### [A01] EndUser project list exposes managers — Dev D — **FIXED**

EndUser `list` → `{ id, name }` only.

### [A01] EndUser module list IDOR — Dev D — **FIXED**

EndUser `listModules` → existence + picker fields (`id`, `name`, `projectId`).

### [A04] RBAC matrix ≠ resource ACL — Dev D — **FIXED**

`manager-project-acl.matrix.spec.ts` + `AssignmentController` in `rbac-matrix.spec.ts` + agents ACL specs.

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
- Web project hooks unwrap `{ data }`

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
- Admin User Management CRUD (product gap, not ACL finding)
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
- Phase 4 Dev D CSRF / throttle carryovers (`Docs/Audit/phase4.md`)
