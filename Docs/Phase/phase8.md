# Phase 8 — Approval chain & dashboard report

**Status:** superseded by [phase9.md](./phase9.md) (2026-10-09). Do not implement this file. Phase 9 keeps the two-step chain but the first approver is `users.reports_to_id`, and the report is the desk report (Admin = all, Manager = team).

## 1. Approval chain (fixed, two steps)

Applies to **service requests** and **changes** only.

| Ticket | Chain |
|--------|--------|
| Has `project_id` and that project has `manager_id` | **Manager first**, then **Admin**. Either step can reject. Fulfillment / schedule still starts only after Admin sets `Approved`. |
| No project, or project has no manager | **Admin only** (one step, same as today). |

Statuses already in the enums — do not add new ones:

| Step | Service request | Change |
|------|-----------------|--------|
| Waiting on Manager | `Submitted` | `Submitted` |
| Manager approved, waiting on Admin | `PendingApproval` | `PendingApproval` |
| Done | `Approved` | `Approved` |
| Rejected at either step | `Rejected` | `RolledBack` (existing reject path) |

Rules:

- Manager `approve` on `Submitted` → `PendingApproval`. Manager cannot set `Approved`.
- Admin `approve` on `PendingApproval`, or on `Submitted` when there is no manager step → `Approved`.
- Admin may also approve a `Submitted` project ticket (skip) — **no**. Admin on `Submitted` while a manager exists → 403. That is the chain.
- Reject: Manager only while `Submitted`; Admin only while `PendingApproval` (or `Submitted` when there is no manager step).
- `ProjectAccessService.assertCanApprove` stays the ownership check for the Manager step.
- Approvals inbox: Manager sees `Submitted` on owned projects; Admin sees `PendingApproval` plus Admin-only (`Submitted` with null project).

Code today jumps `Submitted` → `Approved` in `ServiceRequestsService.approve` and `ChangesService.approve`. That is the change.

## 2. Dashboard report generation

Today the Admin dashboard builds a CSV **in the browser** from chart state (`export-dashboard-csv.ts`). That is not a generated report.

Add:

| Piece | Notes |
|-------|--------|
| `GET /admin/dashboard/report?range=7d\|30d\|ytd` | Admin only. Server builds the same sections already in `buildDashboardCsv` (meta, KPIs, status, priority, module, SLA). Response `text/csv` with `Content-Disposition` attachment. |
| Dashboard button | **Generate report** calls that URL and downloads. Delete the client CSV assembly once the endpoint is the only path. |

No PDF library, no saved reports, no report designer, no scheduled email.

## Tracks

| Dev | Work | Plan |
|-----|------|------|
| **D** | Chain in both approve/reject services; report endpoint | [Dev D/phase8.md](./Dev%20D/phase8.md) |
| **B** | Approvals inbox: Manager vs Admin queues match the chain | [Dev B/phase8.md](./Dev%20B/phase8.md) |
| **C** | Generate report button | [Dev C/phase8.md](./Dev%20C/phase8.md) |
| **A** | None | — |

## Out of scope

Drag-drop approval designer, more than two steps, incident/problem approvals, PDF, custom report builder.
