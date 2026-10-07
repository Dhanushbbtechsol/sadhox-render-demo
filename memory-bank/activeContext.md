# Active Context

**Current focus:** Phase 6 designed (Projects / Manager). **Do not start Phase 6 code until Phase 5 Medium gaps are closed.** Do not rebuild Knowledge Base.

**Branch:** `Audit` (tracks `origin/Audit`). Tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`.

## What is true now
- Phases 1–5 feature work merged into `Audit` (KB included).
- Phase 6 design locked: [Docs/Phase/phase6.md](../Docs/Phase/phase6.md)
  - Employee = Agent; +`Manager` only
  - Approvals: Admin **and** Manager (alongside), single-level; null project → Admin-only
  - Managers **not** in `project_members`; no `users.manager_id`
  - Resource ACL via `ProjectAccessService` (guards alone insufficient)

## Immediate next steps
1. **Gate:** SLA rules `GET`/`PATCH` API (Dev D); Admin Knowledge unwrap `{ data }` + kill silent mock writes (Dev C).
2. Then Phase 6 per track plans (Days 26–30).
3. Phase 4 Dev D security carryovers still open (scripts / CSRF).
4. Go-live when TL approves.

## Decision reminders
- AuthZ = Nest `@Roles` **plus** project resource checks in services.
- Ponytail minimal diffs; commit/push only when asked.
