# Phase 9 reaudit — 2026-10-10 (remediated)

Scope: `Audit` after Dev D reaudit fixes + ChangesService org-chart restore. Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults).

**Open findings (Phase 9): 0 Critical · 0 High · 0 Medium · 0 Low.**
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **PASS**.

**Owners:** [Dev A](./Dev%20A/phase9.md) · [Dev B](./Dev%20B/phase9.md) · [Dev C](./Dev%20C/phase9.md) · [Dev D](./Dev%20D/phase9.md)

## What changed

New tickets are no longer filed with a project on the create forms. Service-request and change approve/reject follow the requester’s / creator’s manager (`users.reports_to_id`), then Admin. Escalation rules, in-app notifications, a scoped desk report, and asset assignment history landed with that.

## Verified

| Control | Evidence |
| --- | --- |
| Org chart | `assertReportsTo` blocks self-links and roles other than Manager or Admin. User create/update is Admin-only. |
| Approve/reject endpoints | `nextApproval` plus `reports_to_id === actor` on service requests **and** changes. Manager cannot final-approve. Admin on `Submitted` with a manager gets 403. |
| Notifications | `GET /notifications` and `PATCH /notifications/:id/read` filter on the JWT user id. A miss is 404. |
| Desk report | Admin `GET /admin/dashboard/report` is scope All. Manager `GET /manager/reports/desk` joins incidents on the assignee’s `reports_to_id` and service requests on the requester’s. Both routes share `THROTTLE_DESK_REPORT` (10/min). `range` and `format` are allow-listed. |
| Escalation rules | `AdminController` is `@Roles("Admin")`. P1 breach and any unassigned breach always include admins. |
| Asset history | `GET /assets/:id/assignments` is Admin-only (`ASSET_ADMIN_ROLES`). |

## High — Resolved

### [A01 / A04] Change approve skips the creator's manager — Dev A — **FIXED**

`ChangesService.approve`, `reject`, and status update for `PendingApproval` / `Approved` / `Rolled Back` use `resolveOrgApprovalActor` + `nextApproval` (creator’s `reports_to_id`). `assertCanApprove` is not used. Manager on `Submitted` → `PendingApproval`; Admin cannot skip a manager; reject sets `RolledBack` after the same gate.

## Medium — Resolved

### [A01] Manager can read a service request outside their team — Dev D — **FIXED**

`ServiceRequestsService.get` returns 403 unless the Manager is the requester’s `reports_to_id`. Project fallback removed. Comments and KB links for `service_request` use the same rule.

### [A04] Reject uses the project gate after the org-chart gate — Dev D — **FIXED**

`ServiceRequestsService.reject` calls `nextApproval` for authorization, then sets `Rejected`. `resolveRejectTransition` is not used. Same pattern on change reject → `RolledBack`.

### [A04] Change PATCH still uses the project manager — Dev D — **FIXED**

Covered under the High fix above (shared `nextApproval` path).

## Low — Resolved

### [A04] Manager desk report is not throttled — Dev D — **FIXED**

`GET /manager/reports/desk` uses `THROTTLE_DESK_REPORT` (same 10/min as Admin desk). RBAC matrix includes the route (Manager only).

## Review checklist (Sonar)

1. Admin `PATCH /changes/:id` `{ status: "Approved" }` on `Submitted` when the creator has a manager → 403.
2. A project manager who is not `reports_to_id` cannot set `PendingApproval`. The creator’s manager can, via `/approve` or PATCH.
3. Manager `GET /manager/reports/desk` does not include another team’s incidents.
4. `PATCH /notifications/:id/read` for someone else’s id → 404.
5. Agent `GET /admin/escalation-rules` and `GET /assets/:id/assignments` → 403.
6. Manager `GET /service-requests/:id` outside team → 403 even with project ownership.
7. Admin reject on `Submitted` with a manager → 403; without a manager → `Rejected`.

## Not checked / out of scope

- Browser walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS and the live `CORS_ORIGIN` value
