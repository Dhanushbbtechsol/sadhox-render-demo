# Phase 6 audit — 2026-10-07

Scope: Projects / `Manager` / resource ACL on `Audit` (committed Dev A + foundation + uncommitted Dev B SR/Change scoping). Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings: 0 Critical · 2 High · 3 Medium · 1 Low.** (Dev B High + catalog Low closed)  
**Status:** Phase 6 in progress — Dev C Admin project UI / Manager dashboard not started.

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## High

### [A01] Assignment pool IDOR — Dev D

`GET /assignment/agents?projectId=` (`assignment.controller.ts` / `assignment.service.ts:83-108`) returns Agent names + emails for any project. No `ProjectAccessService.assertCanAccess`.

**Fix:** when `projectId` set, `assertCanAccess(user, projectId)` before listing.

### [A01 / A04] SR / Change create stamps any `projectId` — Dev B — **FIXED**

Was: `resolveProjectModule` existence-only. Now: `ProjectsService.resolveTicketProjectFields` on SR/Change create (non-EndUser → `assertCanAccess`). See [Dev B/phase6.md](./Dev%20B/phase6.md).

### [A01] Problems assignee ignores project pool — Dev A

`problems.service.ts` create/update: `assertUserExists(assignedTo)` only. Incidents use `assertAssigneeInPool` / `isInPool`.

**Fix:** mirror incidents — require assignee in project_members when `projectId` set (Agent role).

## Medium

### [A01] EndUser project list exposes managers — Dev D

`ProjectsService.list` returns all projects for EndUser including `managerId` / `managerName`. Phase 6 doc said EndUser N/A for project lists; code intentionally opens pickers — still over-discloses org structure.

**Fix:** redacted picker DTO (`id`, `name` only) for EndUser.

### [A01] EndUser module list IDOR — Dev D

`listModules` skips `assertCanAccess` for EndUser (project exists only). With full project UUIDs, modules enumerable org-wide.

**Fix:** redact or scope module list the same as attachable projects.

### [A04] RBAC matrix ≠ resource ACL — Dev D

`rbac-matrix.spec.ts` checks `@Roles` metadata only. Phase 6 requires Manager × (own / other / null) for approve + lists. `AssignmentController` not in matrix.

**Fix:** service-level cases for approve/list/agents ACL.

## Low / Hardening

| Item | Owner | Fix |
| --- | --- | --- |
| Manager missing from catalog `GET` `@Roles` | B/D | **FIXED** — `"Manager"` on catalog list + web route |
| DEV mock Manager password `"password"` | web | Already `import.meta.env.DEV`-gated — keep it |

## Still sound (spot-checked)

- `assertCanApprove`: Manager own-project only; null project → Admin only
- Ticket list/get scope: Manager owned projects; Agent members + null; EndUser ownership
- `addMember` rejects non-Agent; Managers not in `project_members`
- Incidents project stamp + assignee pool OK
- Drizzle parameterized; no user-driven `exec` in Phase 6 deltas
- Seed Manager uses generated/SEED_PASSWORD + bcrypt 12 (not a fixed weak default)

## Dev C missing (in-scope, not findings until built)

- No `/admin/projects` UI (backend Admin CRUD exists)
- No Manager-scoped dashboard filters

## Review checklist (Sonar)

1. Manager approve other project / null project → 403; own → 200.
2. Agent `GET /assignment/agents?projectId=<foreign>` → 403 after fix.
3. Agent create SR/Change with foreign `projectId` → 403 after fix.
4. Problem assign non-member on project ticket → 400 after fix.
5. EndUser `GET /projects` does not return manager identities after redact.
6. Smoke: Manager cannot appear as `project_members` worker.

## Not checked / out of scope

- Full Playwright Phase 6 walkthrough
- Dev C UI (not landed)
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
