# Security Audit: Dev C (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: Admin project CRUD UI + Manager dashboard filters.

## Status

**Not started** on UI track — no security findings in Dev C Phase 6 code yet.

Backend Admin project/module/member APIs exist (`ProjectsController`). Missing:

- `/admin/projects` (or equivalent) route + CRUD UI
- Manager-scoped admin dashboard / chart filters

When building: do not trust client role gates alone; reuse Nest Admin mutators + `ProjectAccessService` for Manager reads.
