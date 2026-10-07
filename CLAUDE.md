# sadhox

Context for AI assistants (Claude). **Canonical product status:** [`Docs/STATUS.md`](./Docs/STATUS.md). **Memory bank:** [`memory-bank/`](./memory-bank/).

## Project Overview

- **Product:** ITSM platform (Incidents, Problems, Service Catalog/Requests, Changes, Assets, Knowledge Base, Admin dashboards)
- **Ecosystem:** TypeScript monorepo (pnpm)
- **Integration branch:** `Audit` (feature tracks: `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`)

## Tech Stack (runtime — use this, not the old scaffold labels)

- **Runtime:** Node.js
- **Frontend:** React + Vite, Tailwind, shadcn/ui, React Query, Zustand — `apps/web`
- **Backend:** NestJS — `apps/server`
- **Database:** PostgreSQL + Drizzle ORM (schema in `apps/server/src/database/schema/`)
- **Auth:** Passport JWT + httpOnly refresh cookies (not Supabase Auth)
- **Realtime:** Socket.io
- **Jobs:** BullMQ + Redis
- **Email:** Resend
- **Hosting intent:** Vercel (web), Render (API/DB/Redis)

## Project Structure

```
sadhox/
├── apps/
│   ├── web/         # React SPA
│   └── server/      # NestJS API + Drizzle schema/migrations
├── packages/        # shared config/env (scaffold auth/db packages unused)
├── Docs/            # PRD, FRD, Workflow, Phase plans, Audits, STATUS.md
└── memory-bank/     # Persistent agent context
```

## Common Commands

- `pnpm install` — Install dependencies
- `pnpm dev` — Start development servers
- `pnpm build` — Production build
- DB push/studio: prefer scripts defined on `apps/server` when changing schema

## Features delivered (summary)

Phases **1–5** merged on `Audit` (Dev-C close-out 2026-10-07): JWT/RBAC, full ITIL CRUD modules, Socket.io comments, SLA jobs, Resend, Admin KPIs/audit/queues, Knowledge Base + portal incident detail + Admin catalog CRUD + dashboard CSV + Admin SLA rules API. Phase 5 Medium/Low closed; Phase 4 Dev D carryovers + go-live remain in `Docs/STATUS.md`.

**Phase 6 (designed):** Projects / modules / `Manager` + resource-level project ACL — [Docs/Phase/phase6.md](./Docs/Phase/phase6.md). Merge Phase 5 close-out to `Audit` before coding. Do not rebuild KB.

## Better Fullstack note

`bts.jsonc` records the **original** generator graph (Hono / Supabase Auth labels). The **shipped application** diverged to NestJS + Passport JWT. Do not reintroduce Hono or Supabase Auth unless explicitly requested. Treat Better Fullstack recipe tooling carefully on existing-project writes.

<!-- <better-fullstack:recipes sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855> -->

<!-- </better-fullstack:recipes> -->

## Maintenance

Keep this file and `Docs/STATUS.md` aligned when major features, stack, or go-live status change.
