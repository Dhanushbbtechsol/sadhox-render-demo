# Active Context

**Current focus:** Dev C Phase 5 **closed** (2026-10-07). Phase 6 designed (Projects / Manager) — merge Phase 5 close-out to `Audit` before coding. Do not rebuild Knowledge Base.

**Branch:** `Dev-C` (Audit merged). Tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`; integration `Audit`.

## What is true now
- Phases 1–5 feature work merged; Dev C audit Mediums fixed (Knowledge `{ data }` unwrap, offline-only mocks).
- Nest `GET`/`PATCH /admin/sla-rules` present; catalog sanitize + option caps present.
- Phase 6 design locked: [Docs/Phase/phase6.md](../Docs/Phase/phase6.md)
  - Employee = Agent; +`Manager` only
  - Approvals: Admin **and** Manager (alongside), single-level; null project → Admin-only
  - Managers **not** in `project_members`; no `users.manager_id`
  - Resource ACL via `ProjectAccessService` (guards alone insufficient)

## Immediate next steps
1. Merge/push `Dev-C` Phase 5 close-out into `Audit` when TL asks.
2. Human live smoke: Admin publish KB → portal; PATCH SLA → DB; CSV download.
3. Phase 6 per track plans (Days 26–30).
4. Phase 4 Dev D security carryovers still open (scripts / CSRF) — verify before go-live.
5. Go-live when TL approves.

## Decision reminders
- AuthZ = Nest `@Roles` **plus** project resource checks in services.
- Ponytail minimal diffs; commit/push only when asked.
