# Production / staging DB migration runbook (Render)

**Status:** prepared only. **Do not run** against any real Render database
until explicitly approved in the working session.

## Preconditions

1. Render Blueprint applied; `sadhox-pg-*` exists.
2. You have the **External** Database URL (or a one-off Shell with private network)
   for running migrations from a trusted machine / Render Shell.
3. Repo at the commit that contains migrations `0000`–`0006` (and any later approved).
4. Schema lock notes: [`schema-lock-2026-09-30.md`](./schema-lock-2026-09-30.md)
   (remote TL DB history — Render DB starts empty).

## Command (from repo root / `apps/server`)

```bash
cd apps/server
# Use the Render Postgres connection string for THIS environment only.
export DATABASE_URL='postgresql://…'   # paste from Render Dashboard → Connect
pnpm db:migrate
```

Equivalent:

```bash
cd apps/server
DATABASE_URL='postgresql://…' pnpm exec drizzle-kit migrate
```

Includes migrations through **`0007_assets_drop_purchase_cost`**
(drops unused `assets.purchase_cost`). Empty Render DB gets the full chain
on first `pnpm db:migrate`.

## Verify after migrate

```bash
# Expect 0000–0006 (or current journal) all present; no missing app columns.
DATABASE_URL='postgresql://…' node scripts/full-schema-diff.mjs
```

Optional seed (separate go-ahead — Day 19):

```bash
DATABASE_URL='postgresql://…' SEED_PASSWORD='…' pnpm db:seed
```

## What we are intentionally not doing yet

- No `preDeployCommand` in `render.yaml` (would migrate on every deploy).
- No migrate against TL `192.168.68.111` as a substitute for Render.
- No `db:push` in production (use migrate only).
