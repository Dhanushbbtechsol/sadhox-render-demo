# Dev D — Phase 4 status (hand to TL)

Last updated: 2026-10-01  
Owner: Dev D  
Plan: [`phase4.md`](./phase4.md)

## Done

| Day | Status | Evidence / artifacts |
| --- | --- | --- |
| **16** Security / 401–403 / cookies / CORS | **Done** | RBAC matrix + cookie (`SameSite=None; Secure` in prod, `Lax` in dev) + CORS fail-closed tests |
| **17** Load testing | **Done** | Live against Nest → `192.168.68.111`. HTTP: GET **100** rps / POST **49.6** rps, **0** errors. Socket: **55/55** join, **0** errors. Notes: [`day17-load-notes.md`](./day17-load-notes.md). Pool/throttle proposals recorded, **not applied** |
| **18** Render Blueprint + env checklist | **Prep done; apply blocked** | root `render.yaml`, [`Docs/production-env-checklist.md`](../../production-env-checklist.md), migration runbook |
| **19** Backup + prod seed | **Prep done; execute blocked** | [`backup-restore-runbook.md`](./backup-restore-runbook.md), `scripts/seed-production.ts`, [`day19-seed-prep.md`](./day19-seed-prep.md) |
| **20** Go-live checklist | **Prep done; execute blocked** | [`go-live-checklist.md`](./go-live-checklist.md) |
| Schema | **Reconciled through 0007** | Migrations `0000`–`0007` in repo journal; [`schema-lock-2026-09-30.md`](./schema-lock-2026-09-30.md) |
| Interfaces table | **Updated** | `AssignmentService.assignNextAgent()` = least-loaded + advisory lock |

Day 17 side-fixes shipped in tree (needed for socket green): HTTP-only JWT/Roles + `HttpThrottlerGuard`; Socket.IO handshake middleware auth; `SentryExceptionFilter` WS → `BaseWsExceptionFilter`.

## Blocked — do not attempt until cleared

| Blocker | Blocks | Clear when |
| --- | --- | --- |
| Explicit **lead go-ahead** to create Render services | Day **18** Blueprint apply + migrate | You confirm in session |
| Real Vercel URL (optional for create) | Browser CORS from real frontend | Replace placeholder `CORS_ORIGIN` later |

`CORS_ORIGIN` at create: `https://placeholder-not-yet-deployed.invalid` (never `*`).

## What runs when blockers clear

### When lead says create Render (**staging only**)

1. Apply Blueprint → `sadhox-api-staging` / `sadhox-pg-staging` / `sadhox-redis-staging`.
2. `CORS_ORIGIN` = `https://placeholder-not-yet-deployed.invalid`.
3. Set secrets (JWT generate or paste; Resend required to boot; Sentry optional).
4. Migrate Render Postgres per [`production-migration-runbook.md`](./production-migration-runbook.md) (confirm before execute).
5. Verify `GET /health` on the staging Render URL.

### Day 17 tuning (optional, post-staging evidence)

| Knob | Proposal (unapplied) |
| --- | --- |
| `THROTTLE_GLOBAL_LIMIT` | Keep **100**/min |
| `DB_POOL_MAX` | Keep **10**; raise to 15–20 only if staging shows pool wait |
| Redis / BullMQ | No change |

## Explicit non-actions (current)

- No Render service creation  
- No migrate/seed against any shared/live database without a new explicit instruction  
- No applying Day 17 pool/throttle proposals without staging evidence or TL ask  
