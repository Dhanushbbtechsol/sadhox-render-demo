# Production / staging environment checklist (Render + Vercel)

Backend host: **Render** (staging and production). Frontend host: **Vercel**.  
Blueprint: root [`render.yaml`](../render.yaml).  
Env validation source: `apps/server/src/config/validate-env.ts`.

## Locked decisions

| Item | Decision |
| --- | --- |
| Region | `oregon` |
| Postgres major | `16` |
| Staging plans | `free` for now |
| Prod resource names | `sadhox-api-prod` / `sadhox-pg-prod` / `sadhox-redis-prod` |
| `CORS_ORIGIN` (Day 18 create) | Temporary: `https://placeholder-not-yet-deployed.invalid` — replace with real Vercel origin later. **Never `*`**. |
| Go-live create | Requires **explicit lead go-ahead** before applying Blueprint |

## CORS_ORIGIN

Day 18 apply value:

`https://placeholder-not-yet-deployed.invalid`

Later (when Vercel exists): exact origin only — scheme + host, **no path**, **no trailing slash**, **never `*`**. Same value for HTTP CORS and Socket.IO.

## Cross-site cookies (SameSite=None)

With `NODE_ENV=production`: `HttpOnly` + `Secure` + `SameSite=None` + `Path=/auth`.  
Correct for Vercel → `*.onrender.com`. See [`Docs/Phase/Dev D/cross-site-refresh-cookie.md`](./Phase/Dev%20D/cross-site-refresh-cookie.md).

Vercel (later): `VITE_SERVER_URL=https://<sadhox-api-…>.onrender.com` (HTTPS).

## Environment variables — Nest web service

| Variable | Required | Source | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | Blueprint `value: production` | Secure cookies; **requires** Resend key |
| `PORT` | yes | **Render-injected** (omit from blueprint) | Nest listens on `PORT` |
| `DATABASE_URL` | yes | `fromDatabase` → `connectionString` | Staging: `sadhox-pg-staging` |
| `REDIS_URL` | yes | `fromService` keyvalue `connectionString` | Staging: `sadhox-redis-staging` |
| `CORS_ORIGIN` | yes | **You** (`sync: false`) | Placeholder at create; real Vercel later |
| `JWT_ACCESS_SECRET` | yes | Blueprint `generateValue: true` **or** paste fresh | min 16 chars |
| `JWT_REFRESH_SECRET` | yes | Blueprint `generateValue: true` **or** paste fresh | min 16 chars |
| `RESEND_API_KEY` | **yes** (prod) | **You** (`sync: false`) | Boot fails without it when `NODE_ENV=production` |
| `MAIL_FROM` | strongly recommended | **You** (`sync: false`) | Verified Resend sender email |
| `SENTRY_DSN` | no | **You** (`sync: false`) | Optional but recommended for Day 20 |
| `LOG_LEVEL` | no | Blueprint `info` | |
| `AUTO_CLOSE_CRON` | no | Blueprint `0 2 * * *` | |
| `AUTO_CLOSE_DAYS` | no | Blueprint `3` | |
| `DB_POOL_MAX` | no | Blueprint `10` | |
| `THROTTLE_GLOBAL_LIMIT` | no | Blueprint `100` | |
| `THROTTLE_GLOBAL_TTL_MS` | no | Blueprint `60000` | |

### What to collect before first successful deploy

**Sentry (new prod/staging project)**

1. Create a project (platform: **Node.js** / Nest).
2. Copy the **DSN** only (looks like `https://<key>@<org>.ingest.sentry.io/<projectId>`).
3. Paste into Render env `SENTRY_DSN`. Nothing else from Sentry is required for boot.

**Resend (required for boot)**

1. Create / open Resend → API Keys → create a **production** key (`re_…`).
2. Domains → add + verify sending domain (DNS).
3. Pick a from-address on that domain (e.g. `noreply@yourdomain.com`).
4. Paste into Render: `RESEND_API_KEY` = the key; `MAIL_FROM` = that address.

Without `RESEND_API_KEY`, Nest **will not start** in production.

### Render resource names

| Role | Staging (in `render.yaml`) | Production (second Environment / Blueprint) |
| --- | --- | --- |
| Web | `sadhox-api-staging` | `sadhox-api-prod` |
| Postgres | `sadhox-pg-staging` | `sadhox-pg-prod` |
| Key Value | `sadhox-redis-staging` | `sadhox-redis-prod` |

### Frontend (Vercel) — later

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SERVER_URL` | yes (when frontend deploys) | Exact Render API origin, HTTPS |

## Still blocked before create

1. **Lead go-ahead** to provision real Render infrastructure (confirm in chat).

## Migration runbook (do not run without go-ahead)

See [`Docs/Phase/Dev D/production-migration-runbook.md`](./Phase/Dev%20D/production-migration-runbook.md).  
Includes `0006_phase4_assets_finance_indexes` and `0007_assets_asset_tag` once applied via `pnpm db:migrate`.

**Note:** staging Postgres Blueprint uses `ipAllowList: []` (private only). Prefer **Render Shell** on the web service for migrate, or temporarily allow your IP / use External URL if you enable public access.
