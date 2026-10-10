# Phase 9 reaudit — 2026-10-10

Scope: `Audit` at `aee9684`, rechecked against Dev A `4db2d05` ("Add EndUser change requests; disable actions"). Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults).

**Open findings (Phase 9): 0 Critical · 1 High · 2 Medium · 1 Low.**
**Pass/fail:** Dev A **FAIL** · Dev B **PASS** · Dev C **PASS** · Dev D **FAIL**.

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

## High — Open

### [A01 / A04] Change approve skips the creator's manager — Dev A

Dev A `4db2d05` replaced the org-chart gate. `ChangesService.approve`, `reject`, and status update use `assertCanApprove` (project manager or Admin) and set `Approved` or `RolledBack` from Submitted, Draft, or PendingApproval (`changes.service.ts`). `nextApproval` is not called. EndUser comments on a change are limited to `createdBy`.

**Fix:** Use the creator's `reports_to_id` and `nextApproval` for those three paths.

## Medium — Open (unchanged by Dev A)

### [A01] Manager can read a service request outside their team — Dev D

`ServiceRequestsService.get` (`service-requests.service.ts`) lets a Manager through when `requesterReportsToId` is not their id, if they can view the project.

**Fix:** 403 unless the caller is that `reports_to_id`.

### [A04] Reject uses the project gate after the org-chart gate — Dev D

`reject` calls `nextApproval`, then `resolveRejectTransition` with `projectId`. A Submitted request with a project and no `reports_to_id` can be approved by Admin and rejected by nobody.

**Fix:** Once `nextApproval` allows the actor, set `Rejected` and drop `resolveRejectTransition`.

## Low — Open

### [A04] Manager desk report is not throttled — Dev D

`GET /admin/dashboard/report` is 10/minute. `GET /manager/reports/desk` is not. Low alone does not fail a dev; Dev D already fails on the Mediums above.

## Medium — Resolved

### [A04] Change PATCH still uses the project manager — Dev D — **FIXED**

`ChangesService.update` calls `resolveOrgApprovalActor` then `nextApproval` before writing `PendingApproval`, `Approved`, or `Rolled Back` (`changes.service.ts`). The actor must be the creator’s `reports_to_id` or an Admin who is not skipping that manager. `assertCanApprove` is not called. `changes.service.spec.ts`, `approval-chain.spec.ts`, and `phase8-approval-chain.spec.ts`: 21 passed.

## Review checklist (Sonar)

1. Admin `PATCH /changes/:id` `{ status: "Approved" }` on `Submitted` when the creator has a manager and the change has no project → 403.
2. A project manager who is not `reports_to_id` cannot set `PendingApproval`. The creator’s manager can, via `/approve` or PATCH.
3. Manager `GET /manager/reports/desk` does not include another team’s incidents.
4. `PATCH /notifications/:id/read` for someone else’s id → 404.
5. Agent `GET /admin/escalation-rules` and `GET /assets/:id/assignments` → 403.

## Not checked / out of scope

- Browser walkthrough
- `pnpm-lock.yaml` CVE scan
- Staging TLS and the live `CORS_ORIGIN` value
