# Production / staging environment checklist (Render — API + SPA)

Backend + frontend host: **Render** (staging client demo and production).  
Blueprint: root [`render.yaml`](../render.yaml).  
Client demo bring-up: [`Docs/Phase/Dev D/render-client-demo-bringup.md`](./Phase/Dev%20D/render-client-demo-bringup.md).  
Env validation source: `apps/server/src/config/validate-env.ts`.

## Locked decisions

| Item | Decision |
| --- | --- |
| Region | `oregon` |
| Postgres major | `16` |
| Staging plans | `free` for now |
| Staging resource names | `sadhox-api-staging` / `sadhox-web-staging` / `sadhox-pg-staging` / `sadhox-redis-staging` |
| Prod resource names | `sadhox-api-prod` / `sadhox-web-prod` / `sadhox-pg-prod` / `sadhox-redis-prod` |
| `CORS_ORIGIN` (first create) | Temporary: `https://placeholder-not-yet-deployed.invalid` — replace with exact Static Site origin. **Never `*`**. |
| Frontend | Render **Static Site** (`runtime: static`), not Vercel |
| Demo data | Full `pnpm db:seed` (Showcase/Scenario) |
| Go-live create | Requires **explicit lead go-ahead** before applying Blueprint |

## CORS_ORIGIN

Day-of-create value:

`https://placeholder-not-yet-deployed.invalid`

After Static Site URL exists: exact origin only — scheme + host, **no path**, **no trailing slash**, **never `*`**. Same value for HTTP CORS and Socket.IO.

## Cross-site cookies (SameSite=None)

With `NODE_ENV=production`: `HttpOnly` + `Secure` + `SameSite=None` + `Path=/auth`.  
Correct for Static Site `*.onrender.com` → API `*.onrender.com` (still cross-site; `onrender.com` is on the public suffix list). See [`Docs/Phase/Dev D/cross-site-refresh-cookie.md`](./Phase/Dev%20D/cross-site-refresh-cookie.md).

Static Site build: `VITE_SERVER_URL=https://<sadhox-api-…>.onrender.com` (HTTPS). Redeploy web after changing it (Vite inlines at build time).

## Environment variables — Nest web service

| Variable | Required | Source | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | Blueprint `value: production` | Secure cookies; **requires** Resend key |
| `PORT` | yes | **Render-injected** (omit from blueprint) | Nest listens on `PORT` |
| `DATABASE_URL` | yes | `fromDatabase` → `connectionString` | Staging: `sadhox-pg-staging` |
| `REDIS_URL` | yes | `fromService` keyvalue `connectionString` | Staging: `sadhox-redis-staging` |
| `CORS_ORIGIN` | yes | **You** (`sync: false`) | Placeholder at create; real Static Site origin later |
| `JWT_ACCESS_SECRET` | yes | Blueprint `generateValue: true` **or** paste fresh | min 16 chars |
| `JWT_REFRESH_SECRET` | yes | Blueprint `generateValue: true` **or** paste fresh | min 16 chars |
| `RESEND_API_KEY` | **yes** (prod) | **You** (`sync: false`) | Boot fails without it when `NODE_ENV=production` |
| `MAIL_FROM` | strongly recommended | **You** (`sync: false`) | Demo: `beth.t@example.com`; else verified domain |
| `SENTRY_DSN` | no | **You** (`sync: false`) | Optional |
| `LOG_LEVEL` | no | Blueprint `info` | |
| `AUTO_CLOSE_CRON` | no | Blueprint `0 2 * * *` | |
| `AUTO_CLOSE_DAYS` | no | Blueprint `3` | |
| `DB_POOL_MAX` | no | Blueprint `10` | |
| `THROTTLE_GLOBAL_LIMIT` | no | Blueprint `100` | |
| `THROTTLE_GLOBAL_TTL_MS` | no | Blueprint `60000` | |

### What to collect before first successful deploy

**Resend (required for boot)**

1. Create / open Resend → API Keys → create a key (`re_…`).
2. **Client demo (no domain):** set `MAIL_FROM=beth.t@example.com`.
3. **Optional later:** Domains → verify sending domain → use `noreply@yourdomain.com`.
4. Paste into Render: `RESEND_API_KEY` = the key; `MAIL_FROM` = that address.

Without `RESEND_API_KEY`, Nest **will not start** in production.

**Sentry (optional)**

1. Create a Node.js / Nest project.
2. Paste DSN into Render `SENTRY_DSN`.

### Render resource names

| Role | Staging (in `render.yaml`) | Production (second Environment / Blueprint) |
| --- | --- | --- |
| API | `sadhox-api-staging` | `sadhox-api-prod` |
| SPA | `sadhox-web-staging` | `sadhox-web-prod` |
| Postgres | `sadhox-pg-staging` | `sadhox-pg-prod` |
| Key Value | `sadhox-redis-staging` | `sadhox-redis-prod` |

### Frontend (Render Static Site)

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SERVER_URL` | yes | Exact Render API origin, HTTPS, no trailing slash; rebuild after change |

SPA rewrite is in Blueprint: `/*` → `/index.html`. Publish path: `apps/web/dist`.

## Still blocked before create

1. **Lead go-ahead** to provision real Render infrastructure (confirm in chat).
2. Free Resend API key ready to paste.

## Migration + demo seed

See [`Docs/Phase/Dev D/render-client-demo-bringup.md`](./Phase/Dev%20D/render-client-demo-bringup.md) and [`Docs/Phase/Dev D/production-migration-runbook.md`](./Phase/Dev%20D/production-migration-runbook.md).

```bash
cd apps/server
pnpm db:migrate
SEED_PASSWORD='…' pnpm db:seed   # full demo — not db:seed:production
```

**Note:** staging Postgres Blueprint uses `ipAllowList: []` (private only). Prefer **Render Shell** on the API service for migrate/seed, or temporarily allow your IP / use External URL if you enable public access.
