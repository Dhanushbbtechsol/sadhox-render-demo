# Security Audit: Dev D (Phase 5)

Reaudit 2026-10-06. Combined: [phase5.md](../phase5.md). Owner: Knowledge foundation APIs, SLA rules API, catalog writes, ops scripts.

## Medium — Open (Phase 5)

### [A04] Missing Admin SLA rules API

Phase 5 Day 23: Admin `GET` / `PATCH` for `sla_rules` (`responseMinutes` / `resolveMinutes` per priority). Dev C UI calls `/admin/sla-rules` (+ path/body PATCH variants). **No route in `apps/server`.**

**Fix:** Admin-only controller (likely under `AdminModule`), DTO MaxLength/Min validation, sanitize if needed, extend `rbac-matrix.spec.ts`.

## Low — Resolved (Phase 5 catalog; landed with Dev B remediation)

### [A03] Catalog create/update not sanitized — **FIXED**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name/description/department and form field strings. Spec: `service-catalog.service.spec.ts`.

### [A04] `formFields.options` unbounded — **FIXED**

`CatalogFormFieldDto.options`: `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Phase 4 carryovers (still open)

### High — [A02 / A05] Hardcoded LAN credentials in scripts

`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs`, `rebaseline-remote-journal.mjs` still default to LAN URLs/creds when env unset.

### Medium — [A07] `SameSite=None` without CSRF defense

### Low — Throttle / logout / Sentry WS auth noise

## Spot-checked (clean / inherited)

- KnowledgeModule RBAC + sanitize on article/category writes (landed via Dev-A foundation on Audit)
- Catalog `POST`/`PATCH` `@Roles("Admin")`; inactive filter Admin-only
- Ticket link ACL in Knowledge service

## Note on migration

Audit kept `0009_phase5_knowledge_base` (Dev-A). Dev-D’s alternate `0009_knowledge_base.sql` was dropped on merge — do not reintroduce a second `0009_*`.
