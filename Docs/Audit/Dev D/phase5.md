# Security Audit: Dev D (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md). Owner: Knowledge APIs, SLA rules API, catalog writes, ops scripts.

**Close-out note 2026-10-07:** Phase 5 Medium/Low items below verified fixed in Nest source (present on `Audit` / merged into `Dev-C`).

## Medium — Resolved (Phase 5)

### [A04] Missing Admin SLA rules API — **FIXED**

`GET /admin/sla-rules`, `PATCH /admin/sla-rules/:priority`, body `PATCH /admin/sla-rules` in `AdminController` / `AdminService`. DTOs + `admin.sla-rules.spec.ts` + `rbac-matrix.spec.ts`. Handoff: [phase5-handoff.md](../../Phase/Dev%20D/phase5-handoff.md).

## Low — Resolved (Phase 5)

### [A03] Catalog create/update not sanitized — **FIXED**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name, description, department, and form field strings. Empty post-sanitize → `400`.

### [A04] `formFields.options` unbounded — **FIXED**

`CatalogFormFieldDto.options`: `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Phase 4 carryovers

### High — LAN credentials in scripts — **FIXED**

`requireEnv` on probe/clean/rebaseline (`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs`, `rebaseline-remote-journal.mjs` via `require-env.mjs`); no LAN fallbacks.

### Medium — [A07] `SameSite=None` without CSRF — **FIXED** (2026-10-08)

`RefreshCookieOriginGuard` on `/auth/refresh` and `/auth/logout`: Origin must match `CORS_ORIGIN` allowlist (prod rejects missing Origin; no custom header).

### Low — still open

- Cap `THROTTLE_GLOBAL_LIMIT` in production
- Throttle `/auth/logout`
- Skip expected `WsException` auth denials in Sentry

## Spot-checked (clean)

- KnowledgeModule RBAC + sanitize on writes
- Catalog `POST`/`PATCH` Admin; inactive filter Admin-only
- Ticket link ACL in Knowledge service
