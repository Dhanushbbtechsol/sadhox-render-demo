# Dev A — Phase 9

**Design:** [../phase9.md](../phase9.md)  
**Wait for** Dev D `reports_to_id`, `NotificationService.record`, and `sendStatusChanged` wiring notes. Incident category/subcategory APIs already exist.

## Incidents and problems

- `apps/web/src/components/incidents/create-incident-dialog.tsx`: remove project and module fields. Do not send `projectId` or `moduleId`. Keep category and subcategory required.
- Same for the problem create form if it sends `projectId`.
- EndUser incident list stays “own tickets only”. Problems stay hidden from EndUser (Phase 7).

## Comments and status mail

Dev D owns the mail send. Dev A only confirms the incident detail comment box still calls `POST /comments`, and the status actions still call the existing incident status PATCH. Do not add a second mail call in the React app.

## Not this track

Approvals inbox, catalog labels, escalation page, reports, assets, bell.
