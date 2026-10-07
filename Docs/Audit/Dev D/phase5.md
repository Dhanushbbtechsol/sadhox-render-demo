# Security Audit: Dev D (Phase 5)

Reaudit 2026-10-06. Combined: [phase5.md](../phase5.md). Owner: Knowledge foundation APIs, SLA rules API, catalog writes, ops scripts.

**Close-out note 2026-10-07:** Phase 5 Medium/Low items below verified fixed in Nest source (present on `Audit` / merged into `Dev-C`).

## Medium — Resolved (Phase 5)

### [A04] Missing Admin SLA rules API — **FIXED**

`GET /admin/sla-rules`, `PATCH /admin/sla-rules/:priority`, body `PATCH /admin/sla-rules` in `AdminController` / `AdminService`. DTOs + `admin.sla-rules.spec.ts` + `rbac-matrix.spec.ts`. Handoff: [phase5-handoff.md](../../Phase/Dev%20D/phase5-handoff.md).

## Low — Resolved (Phase 5)

### [A03] Catalog create/update not sanitized — **FIXED**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name/description/department and form field strings.

### [A04] `formFields.options` unbounded — **FIXED**

`CatalogFormFieldDto.options`: `@MaxLength` per string + `@ArrayMaxSize`.

## Phase 4 carryovers (still open)

### High — [A02 / A05] Hardcoded LAN credentials in scripts

`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs`, `rebaseline-remote-journal.mjs` — require env via `require-env.mjs` when merged; confirm no LAN defaults remain on your branch before go-live.

### Medium — [A07] `SameSite=None` without CSRF defense

### Low — Throttle / logout / Sentry WS auth noise

## Spot-checked (clean / inherited)

- KnowledgeModule RBAC + sanitize on article/category writes
- Catalog `POST`/`PATCH` `@Roles("Admin")`; inactive filter Admin-only
- Ticket link ACL in Knowledge service

## Note on migration

Audit kept `0009_phase5_knowledge_base` (Dev-A). Dev-D’s alternate `0009_knowledge_base.sql` was dropped on merge — do not reintroduce a second `0009_*`.
