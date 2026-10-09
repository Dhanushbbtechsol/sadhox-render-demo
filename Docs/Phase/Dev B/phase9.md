# Dev B — Phase 9

**Design:** [../phase9.md](../phase9.md)  
**Wait for** Dev D `nextApproval` and the SR submit recipient change.

## Forms

- Service request and change create forms: remove project and module pickers. Do not send `projectId` or `moduleId`.
- Catalog cards stay “Request Service”. Do not open an incident from a catalog item (Phase 7).

## Approvals inbox

File: `apps/web/src/routes/approvals.tsx`.

| Viewer | Rows |
| --- | --- |
| Manager | `Submitted` where the requester’s `reports_to_id` is the current user. Button label **Send to admin**. |
| Admin | `PendingApproval`, plus `Submitted` whose requester has no manager. Button label **Approve**. |

Manager must not see a final Approve button. Reject stays available on the row they are allowed to act on.

## Not this track

Org-chart user form, escalation editor, queue/audit pages, desk report, assets, bell.
