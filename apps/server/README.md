# apps/server — NestJS API (Dev D)

## Scripts

```bash
pnpm --filter server dev
pnpm --filter server build
pnpm --filter server start:prod
pnpm --filter server check-types
pnpm --filter server lint
pnpm --filter server test
pnpm --filter server db:migrate
pnpm --filter server db:seed
```

## Environment

Copy `.env.example` to `.env` (never commit secrets).

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `REDIS_URL` | yes | Redis for BullMQ (from env, never hardcode) |
| `CORS_ORIGIN` | yes | Web origin for HTTP + Socket.io |
| `JWT_ACCESS_SECRET` | yes | min 16 chars |
| `JWT_REFRESH_SECRET` | yes | min 16 chars |
| `PORT` | no | default `3000` |
| `NODE_ENV` | no | `development` \| `production` \| `test` |
| `RESEND_API_KEY` | production | required when `NODE_ENV=production` |
| `MAIL_FROM` | with Resend | verified sender address |
| `SENTRY_DSN` | no | omit to disable Sentry (esp. local) |
| `LOG_LEVEL` | no | default `info` |

Host ports in `.env.example` match root `docker-compose.yml` publishes (Postgres **5437**, Redis **16379**).

## Checkpoint 2 (Phase 2)

Prove locally (compose Postgres `:5437` + Redis `:16379`):

```bash
# API running with REDIS_URL / DATABASE_URL pointing at compose
SEED_PASSWORD=... DATABASE_URL=... REDIS_URL=... node scripts/checkpoint2-verify.mjs
```

**Evidence (local, 2026-09-28):**

| Check | Result |
| --- | --- |
| `GET /health` | `database=up`, `redis=up`, queues `sla-queue=up`; echoes `x-request-id` |
| WS bad JWT | Nest logs `ws rejected`; client disconnected (`io server disconnect`) |
| WS good JWT | Stays connected; `ws connected userId=… role=Admin` |
| BullMQ Redis | `bull:sla-queue:repeat:sla-breach-evaluator*` keys present |
| Audit mutation | `POST /service-requests` → `audit_log` row with `actor_id` |
| Sentry | Init skipped when `SENTRY_DSN` empty (local); enable on staging via env |

**Staging blueprint:** root `render.yaml` provisions `sadhox-redis-staging` (keyvalue) and wires `REDIS_URL` into `sadhox-api-staging`. Deploy via Render Blueprint to close cloud Checkpoint 2.

**WS room ACL (interim):** Admin/Agent may `join` ticket rooms; EndUser denied until Phase 3 ownership.
