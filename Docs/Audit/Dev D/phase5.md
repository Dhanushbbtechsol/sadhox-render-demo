# Security Audit: Dev D (Phase 5)

Reaudit 2026-10-07. Combined: [phase5.md](../phase5.md). Owner: Knowledge foundation APIs, SLA rules API, catalog writes, ops scripts.

## Medium — Resolved (Phase 5)

### [A04] Missing Admin SLA rules API — **FIXED (verified)**

`GET /admin/sla-rules`, `PATCH /admin/sla-rules`, `PATCH /admin/sla-rules/:priority` on `AdminController`; `listSlaRules` / `updateSlaRule`; DTO validation; RBAC matrix + `admin.sla-rules.spec.ts`.

## Low — Resolved (Phase 5)

### [A03] Catalog create/update not sanitized — **FIXED (verified)**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name, description, department, and form field `name` / `label` / `options`. Empty post-sanitize required fields → `400`. Spec: `service-catalog.service.spec.ts`.

### [A04] `formFields.options` unbounded — **FIXED (verified)**

`CatalogFormFieldDto.options`: `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Phase 4 carryovers

### High — [A02 / A05] Hardcoded LAN credentials in scripts — **FIXED (verified)**

`requireEnv` on probe/clean/rebaseline; scripts README documents no LAN fallbacks.

### Medium — [A07] `SameSite=None` without CSRF defense — **Still open**

Prod refresh cookie remains `HttpOnly` + `Secure` + `SameSite=None`. No CSRF token/custom header on `/auth/refresh` or `/auth/logout`.

### Low — still open

- Cap / refuse oversized `THROTTLE_GLOBAL_LIMIT` in production (`validate-env` / `resolveThrottleGlobal`).
- Throttle `/auth/logout` (login 5/min, refresh 10/min; logout unthrottled).
- Skip expected `WsException` auth denials in `sentry-exception.filter.ts` (still captures all WS).

## Spot-checked (clean)

- KnowledgeModule RBAC + sanitize on article/category writes
- Catalog `POST`/`PATCH` `@Roles("Admin")`; inactive filter Admin-only
- Ticket link ACL in Knowledge service
- Migration journal keeps single `0009_phase5_knowledge_base`
