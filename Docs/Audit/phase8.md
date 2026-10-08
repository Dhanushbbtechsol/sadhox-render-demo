# Phase 8 audit — 2026-10-08

Scope: `Audit` at `0d51bb6` (approval chain, approvals inbox, dashboard CSV). Diff base: `4ec5e48`. Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults). Dev A had no Phase 8 diff.

**Open findings (Phase 8): 0 Critical · 0 High · 1 Medium · 0 Low.**
**Pass/fail:** Dev A **PASS** · Dev B **FAIL** · Dev C **PASS** · Dev D **PASS**.

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

## Medium

### [A04] Agent can skip the Manager step on a change — Dev B

`PATCH /changes/:id` allows `Submitted` → `PendingApproval` (`approval-policy.ts` `CHANGE_ALLOWED_TRANSITIONS`). `ChangesService.update` only role-checks `Approved`, `Rolled Back`, and `Scheduled` (`changes.service.ts` around the status block). An Agent who can view the change can set `PendingApproval`. Admin then sees it as “waiting on admin,” which is the state after a Manager approve.

Service-request approve/reject do not have this PATCH path.

**Fix:** treat `PendingApproval` like approve: Manager who passes `assertCanApprove`, or Admin only when `projectRequiresManagerStep` is false. Agent → 403.

## Review checklist (Sonar)

1. Agent `PATCH /changes/:id` `{ status: "PendingApproval" }` on a `Submitted` project change → 403 after the fix. Today it succeeds.
2. Manager `POST/PATCH` approve on someone else’s project → 403. Own project `Submitted` → `PendingApproval`.
3. Admin approve on `Submitted` with a manager → 403. On `PendingApproval` → `Approved`.
4. Agent `GET /admin/dashboard/report` → 403. Admin `range=30d` returns `text/csv` and `Content-Disposition`.
5. Prod `POST /auth/refresh` with a foreign `Origin` → 403. Missing `Origin` in prod → 403.

## Not checked / out of scope

- Browser walkthrough of the inbox
- `pnpm-lock.yaml` CVE scan
- Staging TLS and the live `CORS_ORIGIN` value
