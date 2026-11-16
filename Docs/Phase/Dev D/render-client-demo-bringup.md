# Render client demo bring-up (API + SPA on Render)

**Goal:** Host Nest + Postgres + Redis + Vite SPA on Render with **full demo seed** for client presentation.

Blueprint: root [`render.yaml`](../../../render.yaml).  
Env checklist: [`Docs/production-env-checklist.md`](../../production-env-checklist.md).  
Migrate details: [`production-migration-runbook.md`](./production-migration-runbook.md).

## Topology

| Service | Blueprint name | Role |
| --- | --- | --- |
| Nest API | `sadhox-api-staging` | Web service (`runtime: node`) |
| Vite SPA | `sadhox-web-staging` | Static site (`runtime: static`) |
| Postgres | `sadhox-pg-staging` | App data |
| Redis | `sadhox-redis-staging` | BullMQ |

Cross-origin: web and API are different `*.onrender.com` hosts → production refresh cookie stays `SameSite=None; Secure`.

## Before apply

1. **Resend (free):** [resend.com](https://resend.com) → API Keys → create `re_…`.  
   Demo sender (no domain verify): `MAIL_FROM=beth.t@example.com`.
2. Render account linked to this GitHub repo; deploy branch **`Audit`**.
3. Do not paste secrets into chat or git.

## Apply Blueprint

1. Push `render.yaml` on `Audit` (or merge first).
2. Render Dashboard → **New → Blueprint** → select repo / branch → apply.
3. When prompted, set API secrets:
   - `RESEND_API_KEY` = `re_…`
   - `MAIL_FROM` = `beth.t@example.com`
   - `CORS_ORIGIN` = `https://placeholder-not-yet-deployed.invalid` (temporary; never `*`)
   - Leave JWT secrets generated
4. For Static Site, set a temporary `VITE_SERVER_URL` if required at create (any valid `https://…` URL), or set after API URL exists (step Wire origins).

## Wait for API health

```bash
curl -sS "https://<sadhox-api-staging>.onrender.com/health"
# expect {"status":"ok"} or equivalent 200
```

Free tier may cold-start ~30–60s on first hit.

## Migrate (empty Render DB)

Prefer **Render Shell** on `sadhox-api-staging` (private `DATABASE_URL` already set):

```bash
cd apps/server
pnpm db:migrate
```

Or from a trusted machine with **External Database URL** (if you temporarily open DB access):

```bash
cd apps/server
DATABASE_URL='postgresql://…' pnpm db:migrate
```

## Full demo seed (not production seed)

```bash
cd apps/server
SEED_PASSWORD='<shared-demo-password>' pnpm db:seed
```

- Creates `admin@sadhox.local`, `agent@sadhox.local`, `enduser@sadhox.local`, managers, Showcase/Scenario data.
- Store the password in a password manager; do not put it in Slack/chat.
- If `SEED_PASSWORD` is unset, the script prints a one-time password to stdout — capture it immediately.
- Do **not** use `pnpm db:seed:production` for this demo (minimal admin only).

## Wire origins (after both URLs exist)

| Service | Variable | Value |
| --- | --- | --- |
| `sadhox-web-staging` | `VITE_SERVER_URL` | `https://<api-host>.onrender.com` (HTTPS, no trailing slash) |
| `sadhox-api-staging` | `CORS_ORIGIN` | `https://<web-host>.onrender.com` (exact origin, no path, no `*`) |

Then **redeploy** the Static Site (Vite bakes `VITE_*` at build time) and **restart/redeploy** the API.

## Smoke (demo piece — CRUD, not realtime)

Goal: walk stakeholders through normal ITSM flows. Live Socket.io comments are **not** required for the demo.

1. Open Static Site URL → login `admin@sadhox.local` (demo password).
2. **Tickets / issues:** open a Showcase incident; create or update status/priority/assignment.
3. **Problems:** open or link a problem; confirm list/detail works.
4. **Change management:** open a Showcase change; walk approve/schedule path as Admin.
5. Optional: catalog request as EndUser; asset or KB browse if time.
6. Cookies (if login flaky): API host `refresh_token` = `HttpOnly; Secure; SameSite=None; Path=/auth`.

Redis/BullMQ still run in the background (required for Nest boot + SLA jobs). Do not block the demo on live comment push or queue UI.

## Free-tier notes for clients

- Idle free web/Redis may spin down; first request is slow.
- If free Postgres is wiped, re-run migrate + `db:seed`.
- Demo UI does not require real inbox delivery; Resend key is only required so Nest boots in production.
