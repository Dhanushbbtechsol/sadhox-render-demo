# Security Audit: Dev D (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md). Owner: Knowledge APIs, SLA rules API, catalog writes, ops scripts.

## Medium — Resolved (Phase 5)

### [A04] Missing Admin SLA rules API — **FIXED**

`GET`/`PATCH /admin/sla-rules` (+ `/:priority`); RBAC + `admin.sla-rules.spec.ts`.

## Low — Resolved (Phase 5)

### [A03] Catalog create/update not sanitized — **FIXED**

`ServiceCatalogService` + empty post-sanitize → `400`.

### [A04] `formFields.options` unbounded — **FIXED**

`@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Phase 4 carryovers

### High — LAN credentials in scripts — **FIXED**

`requireEnv`; no LAN fallbacks.

### Medium — [A07] `SameSite=None` without CSRF — **Still open**

No CSRF token/custom header on `/auth/refresh` or `/auth/logout`.

### Low — still open

- Cap `THROTTLE_GLOBAL_LIMIT` in production
- Throttle `/auth/logout`
- Skip expected `WsException` auth denials in Sentry

## Spot-checked (clean)

- KnowledgeModule RBAC + sanitize on writes
- Catalog `POST`/`PATCH` Admin; inactive filter Admin-only
- Ticket link ACL in Knowledge service
