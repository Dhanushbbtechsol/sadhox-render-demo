# Local ops scripts

These scripts are **manual local/lab tooling**. They are not wired into Nest build, `dist/`, CI, or Render deploy.

## Required environment

Scripts that touch Postgres/Redis **require** `DATABASE_URL` and/or `REDIS_URL`.
There are **no** hardcoded LAN fallbacks (`192.168.68.*` etc.). If a var is missing, the script exits with a clear error.

Values may be exported in the shell, or placed in `apps/server/.env` (loaded via `dotenv`).

### Local docker-compose example

Root `docker-compose.yml` publishes Postgres **5437** and Redis **16379**:

```bash
cd apps/server

# Option A — use .env (copy from .env.example)
# DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox
# REDIS_URL=redis://127.0.0.1:16379

# Option B — inline
DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox \
REDIS_URL=redis://127.0.0.1:16379 \
  node scripts/probe-remote-services.mjs
```

### Scripts hardened in this pass

| Script | Required env | Notes |
| --- | --- | --- |
| `probe-remote-services.mjs` | `DATABASE_URL`, `REDIS_URL` | Connectivity probe |
| `probe-remote-pg-redis.mjs` | `DATABASE_URL`, `REDIS_URL` | Minimal ping |
| `clean-sla-failed-jobs.mjs` | `REDIS_URL` | Paginated remove of **failed** `sla-queue` jobs; reports scheduler count (does not delete `sla-breach-evaluator`) |
| `inspect-failed-jobs.mjs` | `REDIS_URL` | Lists failed BullMQ jobs |
| `rebaseline-remote-journal.mjs` | `DATABASE_URL` or `REMOTE_DATABASE_URL` | Prefer `show`; `rebaseline` is destructive |

Shared helper: `require-env.mjs`.
