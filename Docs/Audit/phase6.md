# Phase 6 reaudit — 2026-10-07 (post merge-to-audit)

Scope: current `Audit` after Dev-A-/B/C/D (+ `main`) merges. Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings (Phase 6): 0 Critical · 0 High · 0 Medium · 0 Low.**  
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **PASS**.

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## Verified remediations

| Item | Evidence |
| --- | --- |
| Assignment agents ACL | `listAgents(user, projectId)` → `assertCanAccess`; `assignment.phase6.spec.ts` |
| SR/Change create project stamp | `resolveTicketProjectFields` on create; non-EndUser `assertCanAccess` |
| Problems assignee pool | `assertAssigneeInPool` → `isInPool` on create/update |
| EndUser project list redact | `{ id, name }` only (`projects.service.ts`) |
| EndUser module list | existence + picker fields; staff still access-scoped |
| Resource ACL matrix | `manager-project-acl.matrix.spec.ts` + Assignment in `rbac-matrix.spec.ts` |
| Catalog Manager role | `@Roles` includes `"Manager"` on catalog list |

## Still sound (spot-checked)

`assertCanApprove` null → Admin only; Manager own-project; Agent-only `project_members`; incident/problem unscoped stamp Admin/EndUser only; Drizzle parameterized; seed Manager via `SEED_PASSWORD`/CSPRNG + bcrypt 12; web `{ data }` unwrap on project hooks.

## Phase 4 carryovers (not Phase 6 findings)

| Sev | Item | Owner |
| --- | --- | --- |
| Medium | `SameSite=None` refresh cookie without CSRF | Dev D |
| Low | Cap `THROTTLE_GLOBAL_LIMIT` in production | Dev D |
| Low | Throttle `/auth/logout` | Dev D |
| Low | Skip expected WS auth denials in Sentry | Dev D |

## Review checklist (Sonar)

1. Manager approve other / null → 403; own → 200.
2. Agent `GET /assignment/agents?projectId=<foreign>` → 403.
3. Agent create SR/Change with foreign `projectId` → 403.
4. Problem assign non-member on project ticket → 400.
5. EndUser `GET /projects` has no `managerId` / `managerName`.
6. Smoke: Manager cannot be `project_members` worker.

## Not checked / out of scope

- Full Playwright Phase 6 walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
- Live Render/Vercel cutover
