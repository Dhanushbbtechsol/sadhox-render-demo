# Security Audit: Dev D (Phase 4)

Reaudit 2026-10-01. Combined: [phase4.md](../phase4.md). Owner: auth cookies, throttle, WS, prod/ops scripts.

**Merge status:** Merged. `purchase_cost` kept; asset_tag as `0007_assets_asset_tag`.

## Phase 1 (still open)

### [A02 / A05] High — Hardcoded LAN credentials in scripts

`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs`, `rebaseline-remote-journal.mjs` still default to LAN URLs/creds when env unset.

Fix: no defaults; exit if URL env missing; rotate matching passwords.

### [A07] Medium — `SameSite=None` without CSRF defense

Cookie flags OK for cross-site SPA. Add CSRF (custom header or double-submit) on `/auth/refresh` + `/auth/logout`.

## Phase 2 (still open)

### Low — Throttle / logout / Sentry

- Cap `THROTTLE_GLOBAL_LIMIT` in production.
- Throttle `/auth/logout` like refresh.
- Skip expected WS auth denials in Sentry (`sentry-exception.filter.ts` still `captureException` for all WS).
