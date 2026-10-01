# Day 20 — Production go-live & verification checklist

**Status:** checklist only. Do not execute against live Render/Vercel until
Days 17–19 gates are cleared and you give an explicit go-ahead.

## Still blocked before this day can run

- [x] TL host / Day 17 load numbers (HTTP + Socket green 2026-09-30; see [day17-load-notes.md](./day17-load-notes.md))
- [ ] Real **Vercel URL** for `CORS_ORIGIN` + `VITE_SERVER_URL` (confirm candidate `https://sadhox.vercel.app` with Dev B)
- [ ] Render services created (Day 18) + migrations applied
- [ ] Backup rehearsal understood (Day 19); prefer **paid** Postgres for PITR
- [ ] Production seed approved and admin password stored in a password manager

## A. API health

- [ ] `GET https://<sadhox-api-prod>.onrender.com/health` → **200** `{ "status": "ok" }`
- [ ] `GET /health/live` → **200** (public liveness)
- [ ] `GET /health/ready` with Admin Bearer → **200** (DB + Redis Terminus)
- [ ] Unauthenticated `/health/ready` → **401**

## B. Frontend ↔ backend connectivity

- [ ] Vercel `VITE_SERVER_URL` = exact Render API origin (HTTPS, no trailing slash)
- [ ] Render `CORS_ORIGIN` = exact Vercel origin (no `*`)
- [ ] Browser login from Vercel UI succeeds
- [ ] DevTools: `refresh_token` cookie on API host is `HttpOnly; Secure; SameSite=None; Path=/auth`
- [ ] Forced access-token expiry → `POST /auth/refresh` with `credentials: include` returns **200**
- [ ] Socket.IO connects with JWT; `join` on a known ticket room succeeds for Admin

## C. Sentry (real error → dashboard)

- [ ] `SENTRY_DSN` set on Render web service
- [ ] Trigger a controlled 500 (agreed test route or temporary throw) **or** use Sentry’s “Send test event” from the linked project
- [ ] Event appears in Sentry project within ~1–2 minutes with `environment=production`
- [ ] Remove any temporary test-only throw before calling shipped

## D. BullMQ job activity

- [ ] Redis Key Value reachable (`/health/ready` Redis check green)
- [ ] Confirm repeatable / delayed jobs exist for SLA evaluator (and auto-close if scheduled)
- [ ] Optionally enqueue a safe test path (e.g. wait for next SLA tick on a seeded overdue ticket in staging first)
- [ ] Worker logs show job `completed` (not stuck `failed`); inspect failed-job counts = 0 after smoke

## E. Admin credential handover (no credentials in git/chat)

Recommended method:

1. Generate admin password only via `scripts/seed-production.ts` stdout (one-time).
2. Immediately store in a **team password manager** (1Password / Bitwarden / Dashlane) as a shared vault item: URL, email `admin@sadhox.local`, password, notes (“rotate after first stakeholder login”).
3. Share the vault item with stakeholders via the manager’s **secure share / invite** — not Slack/email plaintext.
4. After first stakeholder login, force a password change (or rotate and re-share) if policy requires.
5. Confirm no `.seed-password` file and no password in CI logs or tickets.

Do **not** draft or paste real passwords into docs, PRs, or chat.

## F. Sign-off

- [ ] Dev D: health + queues + Sentry verified  
- [ ] Dev B: catalog / requests smoke from Vercel  
- [ ] TL: stakeholder vault share completed  
- [ ] Declare **shipped**
