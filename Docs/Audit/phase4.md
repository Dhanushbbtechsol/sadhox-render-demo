# Phase 4 reaudit — 2026-10-01

Scope: current `Audit` tree after Dev-A/B/C/D Phase 4 merges + Dev-A/B remediations. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings: 1 High · 1 Medium · 3 Low** (all Dev D). Dev A/B Medium/Low closed. No Critical.

**Owners:** [Dev A](./Dev%20A/phase4.md) · [Dev B](./Dev%20B/phase4.md) · [Dev C](./Dev%20C/phase4.md) · [Dev D](./Dev%20D/phase4.md)

## Verified remediations

| Item | Evidence |
| --- | --- |
| Comment sanitize choke point | `CommentsService.create` → `sanitizePlainText`; empty rejected |
| Additive link-to-problem | `POST /problems/:id/incidents/:incidentId`; UI uses it |
| Reject reason MaxLength + sanitize | `RejectServiceRequestDto` `@MaxLength(4000)`; service sanitizes |
| Agent cannot `Rolled Back` | `CHANGE_ADMIN_GATED_STATUSES` includes `Rolled Back` |
| Free-text + email subjects | Resolution / reject / fulfill sanitized; `sanitizeEmailSubjectPart` |
| `purchase_cost` merge hold | Kept (Dev-C). Journal: `0006_phase4_assets_finance_indexes` + `0007_assets_asset_tag`. Drop migration not merged (`schema-lock-2026-09-30.md`) |

## Still open — Dev D

### High — [A02 / A05] Hardcoded LAN DB/Redis defaults

`probe-remote-services.mjs`, `clean-sla-failed-jobs.mjs`, `rebaseline-remote-journal.mjs` still fall back to `sadhox:sadhox@192.168.68.111` / Redis LAN when env unset.

Fix: require env URLs; fail fast; rotate matching passwords.

### Medium — [A07] `SameSite=None` without CSRF defense

Prod refresh cookie: `HttpOnly` + `Secure` + `SameSite=None` (correct for cross-site SPA). No CSRF token/custom header on `/auth/refresh` or `/auth/logout`.

Fix: custom header or double-submit CSRF; optionally bind `Origin`/`Referer` to `CORS_ORIGIN`.

### Low

| Item | Fix |
| --- | --- |
| `THROTTLE_GLOBAL_LIMIT` no prod ceiling | Cap / refuse oversized values in production |
| `/auth/logout` unthrottled | Same band as refresh (e.g. 10/min) |
| WS auth denials → Sentry | Skip expected `WsException` auth failures (`sentry-exception.filter.ts` still captures all WS) |

## Still sound (spot-checked)

Assets Admin + `purchaseCost` omitted from `listLinkedPublic` + audit redact; change/SR Admin approve; CORS fail-closed; helmet; login throttle; JWT WS + room ACL; Drizzle parameterized; seed/prod-seed gates.

A03 SQL / A06 CVE scan / A10 SSRF: nothing new to file in Phase 4 deltas.

## Optional follow-on (not findings)

- [ ] Smoke: EndUser cannot link problems or see `purchaseCost`
- [ ] Smoke: Agent `PATCH` change → `Rolled Back` → 403; Admin OK
- [ ] Smoke: `POST /comments` with HTML is stripped
- [ ] Smoke: probe scripts fail without env (after fix)

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Live Render/Vercel runtime beyond `render.yaml`
- Infra outside the repo (WAF, managed Postgres/Redis ACLs)
