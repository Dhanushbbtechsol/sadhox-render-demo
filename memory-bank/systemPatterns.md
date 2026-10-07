# System Patterns

## Architecture
- **Client:** React SPA (`apps/web`) on Vite → talks only to NestJS API (no direct DB).
- **API:** NestJS (`apps/server`) — Controllers → Services → Drizzle. Global `JwtAuthGuard`, `RolesGuard`, `HttpThrottlerGuard`; `AuditLogInterceptor` on mutations.
- **Schema:** Drizzle tables live in `apps/server/src/database/schema/index.ts` (not `packages/db` — that scaffold path is unused).
- **Auth:** Passport JWT access token + rotating httpOnly refresh cookie; roles in JWT claims.
- **Realtime:** Socket.io gateway; comment create emits to room `ticket:{id}`.
- **Jobs:** BullMQ + Redis — SLA breach (~5 min), resolved auto-close, email dispatch.
- **Email:** Resend from Nest `MailModule` (in-process / queue), not Edge Functions.
- **Obs:** Pino logs, Sentry, Swagger, Terminus health (`/health`, live/ready).

## Monorepo (actual)
```
apps/web/      # React + Vite + Tailwind + shadcn + React Query + Zustand
apps/server/  # NestJS modules (auth, incidents, problems, knowledge, catalog, …)
packages/     # shared config/env only (no active auth/db packages)
```

## Track ownership (code → people)
| Track | Owns |
|-------|------|
| Dev D | Auth, schema/migrations, Socket.io, BullMQ, mail, CI/deploy, Knowledge API, catalog writes |
| Dev A | Incidents, Problems, assignment UX, comments UI, portal incident detail, ticket↔KB links |
| Dev B | Service catalog/requests, Changes, End User KB browse, Admin catalog UI |
| Dev C | Assets, Admin dashboard/charts/audit/queues, Resend templates, Admin KB authoring, SLA UI, CSV |

## Workflow conventions
- Feature work on `Dev-A-`, `Dev-B`, `Dev-C`, `Dev-D`; merge into `Audit` for review.
- Audits under `Docs/Audit/` (phase summaries + per-dev folders). Prefer ponytail minimal fixes.
- Prefer reuse of existing Nest modules / React Query hooks over new abstractions.

## Phase 6 (planned) AuthZ pattern
Role guards remain necessary but not sufficient. Ticket/project visibility and Manager approvals need **`ProjectAccessService`** (Admin always; Manager via `projects.manager_id`; Agent via `project_members`). Design: `Docs/Phase/phase6.md`.

## Note on Better Fullstack
Original scaffold (`bts.jsonc`, Hono/Supabase labels in generated docs) is historical. Runtime product stack is NestJS + Passport JWT + Drizzle-in-server. Do not assume Hono or Supabase Auth for new work.
