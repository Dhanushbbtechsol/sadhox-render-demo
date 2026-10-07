# Phase 6 reaudit — 2026-10-07 (post latest merge-to-audit)

Scope: current `Audit` after Dev-A-/B/C/D merges (dialog Admin projects UI, ticket project scope edits, Admin users API, expanded seed). Stack: NestJS + Drizzle + Passport JWT + React/Vite.

**Open findings (Phase 6): 0 Critical · 0 High · 0 Medium · 1 Low** (local seed default password).  
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **PASS** (Low alone does not fail).

**Owners:** [Dev A](./Dev%20A/phase6.md) · [Dev B](./Dev%20B/phase6.md) · [Dev C](./Dev%20C/phase6.md) · [Dev D](./Dev%20D/phase6.md)

No `.review.yml` (Sonar defaults).

## Verified remediations (still hold)

| Item | Evidence |
| --- | --- |
| Assignment agents ACL | `listAgents` → `assertCanAccess`; `assignment.phase6.spec.ts` |
| SR/Change create project stamp | `resolveTicketProjectFields` on create |
| Problems assignee pool | `assertAssigneeInPool` / `isInPool` |
| EndUser project/module redact | picker DTOs; staff still access-scoped |
| Resource ACL matrix | `manager-project-acl.matrix.spec.ts` + Assignment in `rbac-matrix.spec.ts` |
| Catalog Manager role | `@Roles` includes `"Manager"` on list |

## New deltas scanned (no High/Medium)

- Admin projects **dialogs** (Dev-B): Nest `@Roles("Admin")` on mutators; `ProtectedRoute` Admin — not client-only.
- Ticket project scope create/edit (Dev-A): UI + `assertMayStampUnscoped` / pool checks.
- Admin users API (Dev-D): class `@Roles("Admin")`; bcrypt 12 + complexity; responses omit hash.
- Manager required on create/update DTO (no null manager via API).

## Low / Hardening

### [A05] Local seed default password — Dev D

`apps/server/scripts/seed.ts` uses `DEFAULT_SEED_PASSWORD = "ChangeMe123!"` when `SEED_PASSWORD` unset (printed / gitignored `.seed-password`). Production seed path remains gated + CSPRNG.

**Fix (optional):** require `SEED_PASSWORD` or always `generateSeedPassword()` even for local seed.

## Still sound

`assertCanApprove` null → Admin only; Agent-only members; Drizzle parameterized; web project hooks unwrap `{ data }`.

## Phase 4 carryovers (not Phase 6)

| Sev | Item |
| --- | --- |
| Medium | CSRF on `SameSite=None` refresh cookie |
| Low | `THROTTLE_GLOBAL_LIMIT` prod ceiling; `/auth/logout` throttle; WS auth → Sentry |

## Review checklist (Sonar)

1. Manager approve other / null → 403; own → 200.
2. Agent foreign `projectId` on agents list / SR create → 403.
3. Admin projects dialogs work; legacy `/admin/projects/:id` redirects to list.
4. Non-Admin cannot hit `/admin/users`.
5. EndUser `GET /projects` has no manager fields.

## Not checked / out of scope

- Full Playwright walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS / secret stores
