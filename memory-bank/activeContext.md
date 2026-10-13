# Active Context

**Current focus:** Client follow-on + 2026-10-13 demo gap close on `Audit`. Final client demo; SSO deferred to integration. Do not rebuild Knowledge Base. Do not number phases 10–15.

**Branch:** local `Audit` (may be ahead of `origin/Audit`). Tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`.

## What is true now
- Phases 1–7 and Phase 9 work + client follow-on are in the tree on `Audit`. See `Docs/STATUS.md`.
- Client follow-on R1–R10: everyday labels, display refs, person asset report, any-user asset holder, category volume floor, project summary one-save, Admin-only project-ticket assign, Queues kept.
- **2026-10-13:** Admin-managed ticket Categories (`incident_categories` / `incident_subcategories`, migration `0015`). Subcategory `minPriority` floors priority → Response time via existing P1–P4 SLA rules. Admin `/admin/categories`. Forms: `GET /incidents/category-taxonomy`. Seed from Phase 7 map + demo floors (e.g. DNS/Firewall P1, Laptop P3).
- Person activity report: `GET /admin/reports/user-activity` (Audit logs UI). Project Members/Modules dialogs restored beside summary edit.
- SLA remains incidents-only: due from `resolveMinutes`; breach/auto-close/Admin rules UI. `responseMinutes` stored, not a separate clock.
- Managers are not `project_members`. Employee = Agent.

## Immediate next steps
1. Client final demo — show Categories + min priority → Response time path.
2. Integration: SSO (deferred).
3. Production go-live only when TL asks (`Docs/Phase/Dev D/go-live-checklist.md`).

## Decision reminders
- AuthZ = Nest `@Roles` plus project checks in services.
- Ticket category taxonomy is Admin DB tables — not Knowledge Base categories, not Catalog item department/subcategory free text.
- Ponytail minimal diffs; commit/push only when asked.
