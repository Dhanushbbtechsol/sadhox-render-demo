# Phase 9 — Org chart, approvals, escalation, notices, reports, assets

**Status:** designed / not started (2026-10-09)  
**Supersedes Phase 8.** Do not implement [phase8.md](./phase8.md). Phase 7 (EndUser labels, portal redirect, seed) still stands and should land first if it is not already in the tree.

Category and subcategory **already exist** on incidents (`category`, `subcategory`) and catalog (`department` + `subcategory`). This phase does not add another category table. It stops using project/module on **new** forms. Do not drop `projects`, `project_members`, or `modules`.

## Locked rules

| Topic | Rule |
| --- | --- |
| Org chart | `users.reports_to_id` → one Manager or Admin. No `teams` table. A Manager’s team is `users.reports_to_id = that manager`. No self-link. |
| Tickets | New incident/request/change forms send category/subcategory only. They do not send `projectId` / `moduleId`. |
| Approval | Service request and change: requester’s manager first (`Submitted` → `PendingApproval`), then Admin (`PendingApproval` → `Approved`). No manager → Admin approves `Submitted` in one step. Manager cannot final-approve. Admin cannot skip a manager. Two steps max. |
| Escalation | One row per P1–P4. Warning at 75% of `resolveMinutes` once. Breach as today. Assignee always. Manager if the row says so. Admin always on P1 breach and on any unassigned breach. |
| Mail | Next actor only. Not every status to Admin. Not every Agent. EndUser gets Assigned, Resolved, Closed, and SR decisions. Change outcomes go to the change creator. |
| In-app | Same events insert `notifications`. Bell reads `GET /notifications`. |
| Queues | Each card has a fixed sentence plus the latest failed job reason. |
| Audit | Timeline shows `diff` as `field: before → after`. |
| Report | One desk report (on-screen sections + CSV of those sections). Admin = all. Manager = tickets assigned to direct reports, and SRs whose requester reports to them. No PDF, no report builder. |
| Assets | Add serial, location, current holder, `assigned_at`. Append `asset_assignments` when the holder changes. Admin only. |

## Order

Dev D schema and APIs first. Then A, B, and C can work in parallel.

| Dev | File |
| --- | --- |
| D | [Dev D/phase9.md](./Dev%20D/phase9.md) |
| A | [Dev A/phase9.md](./Dev%20A/phase9.md) |
| B | [Dev B/phase9.md](./Dev%20B/phase9.md) |
| C | [Dev C/phase9.md](./Dev%20C/phase9.md) |

## Out of scope

Named teams, dropping project tables, N-level approval designer, drag-drop escalation builder, PDF, muting SLA or approval mail, CMDB.
