# Dev D — Phase 9

**Design:** [../phase9.md](../phase9.md)  
**Do this before A/B/C.** Tests: `pnpm --filter server exec vitest run <file>`.

## 1. Org chart

- Column `users.reports_to_id` uuid null, FK `users.id`, `ON DELETE SET NULL`.
- `apps/server/src/admin/org-chart.ts` exports `assertReportsTo(reportsToId, userId, reportsToRole)`. Throw `BadRequestException` on self-link or role other than `Manager` or `Admin`.
- Call it from user create/update. `reportsToId: null` clears the link and skips the assert.
- Test: `apps/server/src/admin/org-chart.spec.ts`.

## 2. Approval chain

- `apps/server/src/common/approval-chain.ts`:

```ts
export function nextApproval(input: {
  status: "Submitted" | "PendingApproval";
  actorRole: "Manager" | "Admin";
  hasManager: boolean;
}): "PendingApproval" | "Approved";
```

`Submitted` + manager + actor Manager → `PendingApproval`. `Submitted` + manager + actor Admin → `ForbiddenException`. Otherwise only Admin → `Approved`. Manager actor must be the requester’s `reports_to_id`.

- Use it in `ServiceRequestsService.approve` / `reject` and `ChangesService.approve` (reject stays the existing rolled-back path).
- Test: `apps/server/src/common/approval-chain.spec.ts`.

## 3. Escalation

- Table `escalation_rules`: `priority` PK, `notify_manager` bool default true, `notify_admin` bool default false. Seed P1 and P2 `notify_admin true`.
- Column `incidents.sla_warned` bool default false.
- `apps/server/src/queues/escalation.ts` exports `escalationRecipients(...)` as specified in phase9 (assignee always; P1 breach and unassigned breach always include admin ids).
- `SlaProcessor`: warning once when elapsed ≥ 75% of `resolveMinutes` and not yet breached; breach uses the same recipient helper instead of “assignee else first admin”.
- `GET` / `PATCH /admin/escalation-rules` and `PATCH /admin/escalation-rules/:priority` body `{ notifyManager, notifyAdmin }`, Admin only.
- Test: `apps/server/src/queues/escalation.spec.ts`.

## 4. Notifications

- `apps/server/src/notifications/recipients.ts` exports `recipientIds(event)`.
  - `sr.submitted` → `[managerId]` or else `adminIds`.
  - `comment.created` → reporter and assignee, minus author.
  - `incident.assigned` → assignee and reporter.
  - `incident.resolved` / `incident.closed` → reporter.
  - `incident.p1_created` → `adminIds`.
- Add `notifications.href` varchar(512) null.
- `NotificationService.record(userId, type, title, body, href)` inserts one row. Callers still send mail through `MailService`, then `record` for the same user.
- Wire `sendStatusChanged` for Assigned, Resolved, Closed to the reporter (method already exists, incident flow does not call it).
- SR submit: `sendRequestReviewRequest` only to `recipientIds` of `sr.submitted`, not every Admin plus the project manager.
- SLA warning/breach: mail `escalationRecipients`, then `record`.
- `GET /notifications` last 30 for the JWT user. `PATCH /notifications/:id/read` sets `readAt` only when `user_id` matches, else 404.
- Test: `apps/server/src/notifications/recipients.spec.ts`.

## 5. Queues

In `AdminService.queueHealth`, add on each row:

- `purpose`: sla-queue = “Every 5 minutes, marks overdue incidents and sends SLA mail.” ticket-lifecycle-queue = “Closes incidents that have stayed Resolved for the auto-close window.” email-queue = “Sends the transactional emails queued by the app.”
- `lastFailure`: `{ jobName, reason, failedAt } | null` from the newest failed BullMQ job (`failedReason`, `finishedOn`).

## 6. Desk report

- `apps/server/src/admin/desk-report.ts` exports `DeskReport` and `deskReportToCsv`.
- Sections in order: title, generated time, range, scope, KPIs, by status, by priority, by category, SLA met/breached/rate.
- `GET /admin/dashboard/report?range=7d|30d|ytd&format=json|csv` Admin, scope `All`.
- `GET /manager/reports/desk?range=&format=` Manager, scope `Team`: incidents whose `assigned_to` reports to the caller; service requests whose `requester_id` reports to the caller.
- `format=csv` → `text/csv` attachment `desk-report-{range}.csv`.
- Test: `apps/server/src/admin/desk-report.spec.ts` (title and `Scope,Team` present).

## 7. Assets

- `assets.serial_number` varchar(128) null, `location` varchar(128) null, `assigned_at` timestamptz null.
- Table `asset_assignments` (`asset_id`, `from_owner_id`, `to_owner_id`, `assigned_by`, `note` varchar(500), `created_at`).
- `assignmentChanged(previous, next)` is true when the owner id changes, including assign and unassign.
- On asset update, if changed, insert one history row, set `assigned_at` to now when the new owner is set, and call existing `sendAssetNotification` for the new owner.
- `GET /assets/:id/assignments` Admin, newest first, owner names joined.
- Test: `apps/server/src/assets/asset-assignment.spec.ts`.

## Hand-off

Publish the new routes in Swagger before A/B/C build UI: user `reportsToId`, escalation rules, notifications, both report URLs, asset assignments.
