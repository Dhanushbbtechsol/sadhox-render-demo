# Security Audit: Dev B (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md). **CLEAN.**

## Low — Resolved

### [A03] Catalog free-text trim-only — **FIXED**

`ServiceCatalogService.create` / `update` run `sanitizePlainText` on name, description, department, and form field `name` / `label` / `options`. Empty post-sanitize → `400`. Spec: `service-catalog.service.spec.ts`.

Also capped `CatalogFormFieldDto.options` with `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Spot-checked (clean)

- End User `/knowledge` uses `use-knowledge` (`{ data }` unwrap)
- Admin catalog routes gated client-side; API `@Roles("Admin")` on writes
- Related help articles link to Published KB (no HTML sink)
