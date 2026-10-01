# Security Audit: Dev D (Phase 4)

Combined: [phase4.md](../phase4.md). Owner: auth cookies, throttle, WS gateway, prod/ops scripts, schema lock.

**Merge status:** Dev-D not fully merged — `_journal.json` conflict vs Dev-C `purchase_cost`.

## Phase 1 (do first)

### [A02 / A05] High — Hardcoded LAN credentials in scripts

`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs` default to `sadhox:sadhox@192.168.68.111` / Redis LAN when env unset. Same pattern already in `rebaseline-remote-journal.mjs` (Phase 3).

Fix: no defaults; exit if URL env missing. Rotate matching passwords.

### [A07] Medium — `SameSite=None` without CSRF defense

Prod refresh cookie flags are otherwise correct (`HttpOnly`, `Secure`, path `/auth`). Add CSRF (custom header or double-submit) on `/auth/refresh` + `/auth/logout`.

## Phase 2

### Low — Throttle / logout / Sentry

- Cap `THROTTLE_GLOBAL_LIMIT` in production.
- Throttle `/auth/logout` like refresh.
- Skip expected WS auth denials in Sentry filter.

### Merge

Coordinate with Dev C on keep vs drop `purchase_cost`; finish journal with all kept migrations, unique tags/idx.
