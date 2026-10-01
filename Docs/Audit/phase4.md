# Phase 4 audit — 2026-10-01

Scope: `Audit` after merging `Dev-A-`, `Dev-B`, `Dev-C` Phase 4; **Dev-D merge in progress** (blocked on `purchase_cost` add vs drop). Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings:** 1 High · 3 Medium · several Low (Dev A Medium/Low closed). No Critical.

**Owners:** [Dev A](./Dev%20A/phase4.md) · [Dev B](./Dev%20B/phase4.md) · [Dev C](./Dev%20C/phase4.md) · [Dev D](./Dev%20D/phase4.md)

**Process hold:** resolve `_journal.json` / `purchase_cost` before treating Dev-D as merged. Prefer product call: keep column (Dev-C finance) **or** drop (Dev-D schema lock) — not both in opposing order.

No `.review.yml` in repo (Sonar skill defaults).

## High

### [A02 / A05] Hardcoded LAN DB/Redis defaults in ops scripts — Dev D

`apps/server/scripts/probe-remote-services.mjs:3-7`, `clean-sla-failed-jobs.mjs:8` (and pre-existing `rebaseline-remote-journal.mjs:3-5`) fall back to `postgresql://sadhox:sadhox@192.168.68.111:…` / Redis LAN URL when env is unset.

Fix: require `DATABASE_URL` / `REDIS_URL` / `REMOTE_DATABASE_URL`; fail if missing. Rotate any password that matched the default.

## Medium

### [A03] Comment sanitize bypass via polymorphic API — Dev A — **FIXED**

`CommentsService.create` calls `sanitizePlainText` and rejects empty post-sanitize content (same helper as incident comments).

### [A07] Prod refresh cookie `SameSite=None` without CSRF defense — Dev D

`refresh-cookie.ts` correctly uses `HttpOnly` + prod `Secure` + `SameSite=None` for cross-site SPA refresh. Cookie-auth POSTs to `/auth/logout` and `/auth/refresh` remain CSRF-able cross-site (CORS still blocks reading `accessToken` if origins stay locked).

Fix: custom header or double-submit CSRF on cookie-auth routes; optionally bind to `Origin`/`Referer` allowlist = `CORS_ORIGIN`.

### [A04] Link-to-problem full replace / lost-update — Dev A — **FIXED**

Additive `POST /problems/:id/incidents/:incidentId`; `link-to-problem.tsx` no longer PATCHes a client-cached full `linkedIncidentIds` array.

### [A04] Reject reason unbounded length — Dev B

`RejectServiceRequestDto.reason` has `@MinLength(1)` only (`service-request.dto.ts:33-37`); fulfill notes already `@MaxLength(4000)`.

Fix: `@MaxLength(4000)` (+ optional `sanitizePlainText`).

### [A01 / A04] Agent can `Rolled Back` without Admin — Dev B

`CHANGE_ADMIN_GATED_STATUSES` is only `Approved`/`Scheduled`. Agents on `PATCH /changes/:id` can set `Rolled Back` from `Submitted` (allowed transition), which emails the creator as rejected — bypassing Admin-only `/approve`.

Fix: gate rejection (`Rolled Back` from Submitted/PendingApproval) to Admin, or add `PATCH …/reject` `@Roles("Admin")`.

## Low / Hardening

| Item | Owner | Fix |
| --- | --- | --- |
| Free-text sanitize gaps (reject / fulfill / resolution) | A/B | **Dev A:** resolution notes sanitized in `IncidentsService.update`. Dev B reject/fulfill still open. |
| `THROTTLE_GLOBAL_LIMIT` no prod ceiling | D | Cap or refuse oversized values when `NODE_ENV=production` |
| `/auth/logout` unthrottled | D | Same band as refresh (e.g. 10/min) |
| WS auth denials → Sentry volume | D | Skip expected `WsException` auth failures |
| DEV mock passwords in `auth-store` | A | Already `import.meta.env.DEV`-gated — keep it that way |

## Still sound (spot-checked)

- Assets: Admin register; `purchaseCost` Admin-only / redacted for Agents; audit redacts `purchaseCost`
- Change approve `@Roles("Admin")`; SR approve/reject Admin
- CORS fail-closed; helmet; login throttle; JWT WS middleware + room ACL
- Drizzle parameterized queries; no user-driven `exec`
- Seed/prod-seed: bcrypt 12, complexity assert, `ALLOW_PRODUCTION_SEED` gate

## Review checklist (Sonar)

1. Confirm `purchase_cost` product decision before finishing Dev-D merge.
2. Smoke: Agent cannot Admin-approve changes/SRs; EndUser cannot link problems or see `purchaseCost`.
3. Smoke: polymorphic `POST /comments` with HTML payload is stripped after fix.
4. Smoke: cross-origin credentialed POST cannot logout/refresh without CSRF token/header.
5. Smoke: concurrent link-to-problem does not drop existing links.
6. Confirm probe scripts fail closed without env (no LAN default).

## Not checked / out of scope

- Staging TLS / secret stores / managed DB ACLs
- `pnpm-lock.yaml` / OSV CVE scan
- Live Render/Vercel runtime beyond `render.yaml`
- Unresolved `_journal.json` correctness until merge completes
