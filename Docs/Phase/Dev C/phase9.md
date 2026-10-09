# Dev C — Phase 9

**Design:** [../phase9.md](../phase9.md)  
**Wait for** the matching Dev D route before each UI block. Copy the SLA rules page for the escalation table. Do not add a report builder.

## 1. User form

`apps/web/src/features/admin/user-form-dialog.tsx`  
Select **Reports to**. Options: `GET /admin/users?role=Manager` and `role=Admin`, excluding the user being edited. Save `reportsToId` or `null`.

## 2. Escalation

New `apps/web/src/features/admin/escalation-page.tsx`. Route `/admin/escalation`. Sidebar **Escalation**, Admin only. Four rows (P1–P4). Toggles `notifyManager` and `notifyAdmin` call `PATCH /admin/escalation-rules/:priority`.

## 3. Queues

`apps/web/src/features/admin/queue-monitor-page.tsx`  
Under each queue’s counts, show `purpose` and, when set, `lastFailure.jobName`, `reason`, and `failedAt`.

## 4. Audit

`apps/web/src/features/admin/audit-activity.ts` exports `formatAuditDiff(diff)`. One line per key: `status: Submitted → Approved`. Null diff → `[]`.  
`AuditTimelineItem` in `audit-logs-page.tsx` renders those lines under the actor.  
Test: `apps/web/src/features/admin/audit-activity.spec.ts`.

## 5. Desk report

Admin dashboard button **Download desk report** → `GET /admin/dashboard/report?range=&format=csv` using the range already on the page.  
A second link **View report** loads `format=json` and renders the sections in order: title, generated time, scope, KPIs, status, priority, category, SLA.  
Manager home: same two controls against `GET /manager/reports/desk`.  
Delete `buildDashboardCsv` in `export-dashboard-csv.ts` after the button works.

## 6. Bell

`apps/web/src/components/layout/top-navbar.tsx`  
Unread count from `GET /notifications`. Click marks `PATCH /notifications/:id/read` and navigates to `href`.

## 7. Assets

`asset-form-dialog.tsx`: serial (max 128), location (max 128), owner select from `GET /admin/users?role=Agent`.  
`asset-register-page.tsx`: expanding a row loads `GET /assets/:id/assignments` (from owner, to owner, note, time). Read-only.

## Not this track

Approval chain rules, incident forms, catalog request flow.
