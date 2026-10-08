# Active Context

**Current focus:** Phases 1–6 are in the tree. Designed only: Phase 7 EndUser desk (`Docs/Phase/phase7.md`); Phase 8 two-step approval + server dashboard report (`Docs/Phase/phase8.md`). Do not rebuild Knowledge Base. Staging/TL migrate and go-live are still deferred.

**Branch:** local `Audit` / `Dev-C` (may be ahead of `origin/Audit`). Tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`.

## What is true now
- Phases 1–5 shipped. Phase 5 Medium/Low closed. See `Docs/STATUS.md`.
- Phase 6 landed: `Manager`, projects/modules/members, `ProjectAccessService`, project-scoped assignment and lists, Admin+Manager approvals (null project = Admin-only), Admin `/admin/users` CRUD. Audit: `Docs/Audit/phase6.md` CLEAN.
- SLA is incidents-only: due time from `resolveMinutes`; breach job + email + auto-close + Admin rules UI + countdown. `responseMinutes` is stored and not applied.
- Managers are not `project_members`. No `users.manager_id`. Employee = Agent.

## Immediate next steps
1. Apply `0010_phase6_projects_manager` + reseed where the DB is behind.
2. Production go-live only when TL asks (`Docs/Phase/Dev D/go-live-checklist.md`).
3. Phase 4 leftovers: CSRF on `SameSite=None` refresh cookie; throttle / Sentry WS noise.

## Decision reminders
- AuthZ = Nest `@Roles` plus project checks in services.
- Ponytail minimal diffs; commit/push only when asked.
