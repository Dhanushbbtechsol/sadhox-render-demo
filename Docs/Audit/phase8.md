# Phase 8 reaudit — 2026-10-08

Scope: `Audit` at `75d8586` (Dev B fix `7cf42fc` on top of `0d51bb6`). Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults).

**Open findings (Phase 8): 0 Critical · 0 High · 0 Medium · 0 Low.**
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **PASS**.

**Owners:** [Dev A](./Dev%20A/phase8.md) · [Dev B](./Dev%20B/phase8.md) · [Dev C](./Dev%20C/phase8.md) · [Dev D](./Dev%20D/phase8.md)

## What changed

Service requests and changes use a Manager-then-Admin chain on `/approve` and `/reject`. The approvals inbox filters Manager (`Submitted` on a project) vs Admin (`PendingApproval`, plus `Submitted` with no project). Admin dashboard **Generate report** downloads `GET /admin/dashboard/report`. Prod refresh CSRF uses an Origin allowlist.

## Verified

| Control | Evidence |
| --- | --- |
| Approve/reject chain | `resolveApprovalNextStatus` / `resolveRejectTransition`: Manager cannot set `Approved`; Admin on a managed `Submitted` ticket → 403 |
| Manager ownership | `assertCanApprove` — Manager only when `projects.manager_id` is self; null project is Admin-only |
| Agent cannot final-approve or roll back via PATCH | `Approved` and `Rolled Back` call `assertCanApprove` then `assertRejectOrFinalApproveAllowed` |
| Report is Admin-only | class `@Roles("Admin")` on `AdminController`; `range` is `7d` \| `30d` \| `ytd` |
| CSV formula cells | `neutralizeSpreadsheetFormula` prefixes `= + - @` tab CR |
| Refresh CSRF | `RefreshCookieOriginGuard` on `POST /auth/refresh` and logout; prod missing Origin → 403; `CORS_ORIGIN=*` rejected |
| Seed password | unset `SEED_PASSWORD` uses `generateSeedPassword()`; re-run does not reset hashes |

## Medium — Resolved

### [A04] Agent can skip the Manager step on a change — Dev B — **FIXED**

`ChangesService.update` calls `assertCanApprove` then `assertPendingApprovalAllowed` before writing `PendingApproval` (`changes.service.ts`). An Agent fails `assertCanApprove`. An Admin on a project that still needs a manager gets 403. A Manager of another project fails `assertCanApprove` (`project-access.service.ts`). `changes.service.spec.ts` and `phase8-approval-chain.spec.ts`: 13 passed.

## Review checklist (Sonar)

1. Agent `PATCH /changes/:id` `{ status: "PendingApproval" }` on a `Submitted` project change → 403.
2. Manager `POST/PATCH` approve on someone else’s project → 403. Own project `Submitted` → `PendingApproval`.
3. Admin approve on `Submitted` with a manager → 403. On `PendingApproval` → `Approved`.
4. Agent `GET /admin/dashboard/report` → 403. Admin `range=30d` returns `text/csv` and `Content-Disposition`.
5. Prod `POST /auth/refresh` with a foreign `Origin` → 403. Missing `Origin` in prod → 403.

## Not checked / out of scope

- Browser walkthrough of the inbox
- `pnpm-lock.yaml` CVE scan
- Staging TLS and the live `CORS_ORIGIN` value
