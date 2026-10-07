# Sadhox

IT Service Management (ITSM) platform: Incidents, Problems, Service Catalog/Requests, Changes, Assets, Knowledge Base, and Admin dashboards.

**Status for agents/Claude:** [`Docs/STATUS.md`](./Docs/STATUS.md) · **Memory bank:** [`memory-bank/`](./memory-bank/)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite, Tailwind, shadcn/ui, React Query, Zustand — `apps/web` |
| Backend | NestJS — `apps/server` |
| Database | PostgreSQL + Drizzle (schema under `apps/server`) |
| Auth | Passport JWT + httpOnly refresh cookies |
| Realtime / jobs / email | Socket.io, BullMQ + Redis, Resend |

(The original Better Fullstack scaffold mentioned Hono/Supabase; the shipped app uses NestJS + Passport JWT.)

## Getting started

```bash
pnpm install
pnpm dev
```

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000) (confirm port in `apps/server` env)

Configure Postgres (and Redis for jobs) via `apps/server` env. Apply Drizzle migrations using the server package scripts.

## Project structure

```
sadhox/
├── apps/web/       # React SPA
├── apps/server/    # NestJS API + Drizzle
├── Docs/           # PRD, FRD, Workflow, Phase plans, Audits, STATUS
└── memory-bank/    # Agent persistent context
```

## Scripts

- `pnpm run dev` — all apps in development
- `pnpm run build` — production build
- `pnpm run check-types` — TypeScript check across apps

## Docs

- [Docs/STATUS.md](./Docs/STATUS.md) — features done / open gaps
- [Docs/Workflow.md](./Docs/Workflow.md) — ITIL workflows in plain language
- [Docs/PRD.md](./Docs/PRD.md) · [Docs/FRD.md](./Docs/FRD.md)
