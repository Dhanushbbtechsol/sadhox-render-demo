# Phase 9 audit — 2026-10-09

Scope: `Audit` at `70c8ab9` (org chart, approval chain, escalation, notifications, desk report, assets). Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults).

**Open findings (Phase 9): 0 Critical · 0 High · 1 Medium · 0 Low.**
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **FAIL**.

**Owners:** [Dev A](./Dev%20A/phase9.md) · [Dev B](./Dev%20B/phase9.md) · [Dev C](./Dev%20C/phase9.md) · [Dev D](./Dev%20D/phase9.md)

## What changed

New tickets are no longer filed with a project on the create forms. Service-request and change approve/reject follow the requester’s manager (`users.reports_to_id`), then Admin. Escalation rules, in-app notifications, a scoped desk report, and asset assignment history landed with that.

## Verified

| Control | Evidence |
| --- | --- |
| Org chart | `assertReportsTo` blocks self-links and roles other than Manager or Admin. User create/update is Admin-only. |
| Approve/reject endpoints | `nextApproval` plus `reports_to_id === actor`. Manager cannot final-approve. Admin on `Submitted` with a manager gets 403. |
| Notifications | `GET /notifications` and `PATCH /notifications/:id/read` filter on the JWT user id. A miss is 404. |
| Desk report | Admin `GET /admin/dashboard/report` is scope All. Manager `GET /manager/reports/desk` joins incidents on the assignee’s `reports_to_id` and service requests on the requester’s. `range` and `format` are allow-listed. |
| Escalation rules | `AdminController` is `@Roles("Admin")`. P1 breach and any unassigned breach always include admins. |
| Asset history | `GET /assets/:id/assignments` is Admin-only (`ASSET_ADMIN_ROLES`). |

## Medium

### [A04] Change PATCH still uses the project manager — Dev D

`PATCH /changes/:id` still gates `PendingApproval`, `Approved`, and `Rolled Back` with `assertCanApprove` and `projectRequiresManagerStep` (`changes.service.ts`, status block in `update`). Phase 9 approve and reject use the creator’s `reports_to_id`.

Two skips:

- Admin can set `Approved` from `Submitted` when the change has no project manager, even if the creator has a `reports_to_id`.
- The project’s `manager_id` can set `PendingApproval` without being that creator’s manager.

`/approve` and `/reject` do not have this path. Service requests have no generic status PATCH.

**Fix:** for those three statuses, use the same `reports_to_id` check as `approve` / `reject`. Do not use the project-manager helpers.

## Review checklist (Sonar)

1. Admin `PATCH /changes/:id` `{ status: "Approved" }` on `Submitted` when the creator has a manager and the change has no project → 403. Today it can succeed.
2. A project manager who is not `reports_to_id` cannot set `PendingApproval`. The creator’s manager can, via `/approve`.
3. Manager `GET /manager/reports/desk` does not include another team’s incidents.
4. `PATCH /notifications/:id/read` for someone else’s id → 404.
5. Agent `GET /admin/escalation-rules` and `GET /assets/:id/assignments` → 403.

## Not checked / out of scope

- Browser walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS and the live `CORS_ORIGIN` value
