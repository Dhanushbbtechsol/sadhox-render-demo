# Phase 6 audit — 2026-10-07

Scope: Projects / `Manager` / resource ACL on `Audit` (committed Dev A + foundation + uncommitted Dev B SR/Change scoping). Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings: 0 Critical · 2 High · 0 Medium · 1 Low** (Dev D items closed 2026-10-07).  
**Status:** Phase 6 in progress — Dev C Admin project UI / Manager dashboard not started. Dev D Phase 6 audit remediations landed on `Dev-D`.

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## High

### [A01] Assignment pool IDOR — Dev D — **FIXED**

`listAgents(user, projectId)` → `assertCanAccess` when `projectId` set. Specs in `assignment.phase6.spec.ts`.

### [A01 / A04] SR / Change create stamps any `projectId` — Dev B

`resolveProjectModule` only checks existence + module∈project. Used by `service-requests.service.ts` / `changes.service.ts` create. Incidents/problems correctly gate non-EndUser access.

**Why:** Agent (or Manager on SRs) can inject tickets into another Manager’s queue without membership/ownership.

**Fix:** for non-EndUser callers, `assertCanAccess` (or reuse project scope resolve + access) before insert.

### [A01] Problems assignee ignores project pool — Dev A

`problems.service.ts` create/update: `assertUserExists(assignedTo)` only. Incidents use `assertAssigneeInPool` / `isInPool`.

**Fix:** mirror incidents — require assignee in project_members when `projectId` set (Agent role).

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
| Manager missing from catalog `GET` `@Roles` | B/D | **FIXED** — `"Manager"` on catalog list |
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

1. Manager approve other project / null project → 403; own → 200. *(covered in manager-project-acl matrix)*
2. Agent `GET /assignment/agents?projectId=<foreign>` → 403. *(Dev D fixed)*
3. Agent create SR/Change with foreign `projectId` → 403 after Dev B fix.
4. Problem assign non-member on project ticket → 400 after Dev A fix.
5. EndUser `GET /projects` does not return manager identities. *(Dev D fixed)*
6. Smoke: Manager cannot appear as `project_members` worker.

## Not checked / out of scope

- Full Playwright Phase 6 walkthrough
- Dev C UI (not landed)
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
