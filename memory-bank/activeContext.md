# Active Context

**Current focus:** Dev C Phase 6 UI + thin projects API on `Dev-C` (2026-10-07). Ticket forms / assignment / Manager approvals still Dev A/B/D. Do not rebuild Knowledge Base.

**Branch:** `Dev-C` (Audit merged). Tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`; integration `Audit`.

## What is true now
- Phases 1–5 feature work merged; Dev C audit Mediums fixed (Knowledge `{ data }` unwrap, offline-only mocks).
- Nest `GET`/`PATCH /admin/sla-rules` present; catalog sanitize + option caps present.
- Phase 6 Dev C: `projects`, `project_members`, `modules`, `Manager` role, `ProjectAccessService`, Admin `/admin/projects` (+ members/modules), Manager `/manager` KPIs + `/manager/dashboard/charts` (server-scoped). QA: `Docs/Phase/Dev C/phase6-qa.md`.
- Local `Audit` fast-forwarded to `166cf3f` (Phase 5 close-out). Not pushed to `origin/Audit`.
- Phase 6 design locked: [Docs/Phase/phase6.md](../Docs/Phase/phase6.md)
  - Employee = Agent; +`Manager` only
  - Approvals: Admin **and** Manager (alongside), single-level; null project → Admin-only — **not wired yet**
  - Managers **not** in `project_members`; no `users.manager_id`
  - Resource ACL via `ProjectAccessService` (guards alone insufficient)

## Immediate next steps
1. **Phase 6 User Management (open):** Dev D `POST`/`GET`/`PATCH /admin/users`; Dev C Admin `/admin/users` UI — see `Docs/Phase/phase6.md`.
2. Push local `Audit` / `Dev-C` when TL asks.
3. Human smoke: Admin project CRUD; Manager home KPIs (`Docs/Phase/Dev C/phase6-qa.md`).
4. Remaining A/B/D ticket scoping / assignment / approvals wiring.
5. Phase 4 Dev D security carryovers (CSRF / throttle / Sentry); go-live when TL approves.

## Decision reminders
- AuthZ = Nest `@Roles` **plus** project resource checks in services.
- Ponytail minimal diffs; commit/push only when asked.
