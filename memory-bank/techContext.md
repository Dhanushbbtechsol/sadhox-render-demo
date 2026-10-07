# Tech Context

**Ecosystem:** TypeScript monorepo (pnpm workspaces)

## Frontend (`apps/web`)
- React + Vite, React Router, Tailwind, shadcn/ui
- React Query for server state; Zustand for auth session (`auth-store.ts` → real `/auth/*`)
- Socket.io client for ticket comment rooms
- Offline/DEV mocks still exist in places (Admin Knowledge/SLA hooks) — prefer live API; see Phase 5 audit

## Backend (`apps/server`)
- NestJS + Node
- PostgreSQL + Drizzle ORM (schema + migrations under server)
- Passport JWT + refresh tokens (`refresh_tokens` table)
- Custom `@Roles("Admin" | "Agent" | "EndUser")`
- Socket.io Nest gateway
- BullMQ + Redis
- class-validator DTOs, Swagger
- `@nestjs/throttler` with Postgres-backed storage
- Resend for mail

## Infra targets
- Frontend: Vercel
- API + Postgres + Redis: Render (`render.yaml` present)
- CI: GitHub Actions
- Observability: Sentry + Pino

## Local commands (root)
- `pnpm install` / `pnpm dev` / `pnpm build`
- DB: server drizzle scripts (see `apps/server` package.json); root `db:push` / `db:studio` may still exist from scaffold — verify against server scripts when changing schema

## Auth reality
Not Supabase Auth. Email/password → Nest `/auth/login` | `/auth/refresh` | `/auth/logout`.
