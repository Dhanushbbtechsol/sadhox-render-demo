# Security Audit: Dev B (Phase 5)

Reaudit 2026-10-07. Combined: [phase5.md](../phase5.md). **CLEAN** (Dev B Phase 5 open items closed).

## Low — Resolved

### [A03] Catalog free-text trim-only — **FIXED**

`ServiceCatalogService.create` / `update` now run `sanitizePlainText` on name, description, department, and form field `name` / `label` / `options` (shared choke point; Admin UI cannot bypass). Empty post-sanitize required fields → `400`. Spec: `service-catalog.service.spec.ts`.

Also capped `CatalogFormFieldDto.options` with `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })` (paired with Dev D [A04] unbounded options).

## Spot-checked (clean)

- End User `/knowledge` browse/search uses `use-knowledge` (correct `{ data }` unwrap)
- Admin catalog routes gated client-side; API `@Roles("Admin")` on `POST`/`PATCH`
- Related help articles are links to Published KB content (no HTML sink)

## Reminder

`ProtectedRoute` on `/admin/catalog` is UX-only. Keep Nest Admin role on writes.
