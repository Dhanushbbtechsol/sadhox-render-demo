# Dev D Track — Core API, Auth & Infrastructure (Backend Lead)

**Developer:** Dev D  
**Role:** Backend Lead / Platform & Infrastructure Engineer (Backend-Exclusive)  
**Tech Stack:** NestJS, TypeScript, PostgreSQL, Drizzle ORM, Passport.js (JWT), BullMQ + Redis, Socket.io, Resend, Pino, Sentry, Railway/Render, GitHub Actions

---

## Ownership & Scope
- NestJS API architecture, configuration, and modular scaffolding.
- Database schema definitions, Drizzle migrations, and connection pooling.
- Authentication & Authorization: Passport JWT strategy, rotating httpOnly refresh tokens, and custom RBAC guards (`Admin`, `Agent`, `EndUser`).
- Real-time Socket.io WebSocket gateway.
- Background worker infrastructure: BullMQ + Redis queues for SLA breaches, auto-closures, and email dispatches.
- Shared utilities: Audit log middleware/interceptor, structured logging (Pino), error monitoring (Sentry), rate limiting (`@nestjs/throttler`).
- CI/CD automation, staging/production infrastructure deployment, and database backup procedures.
- **Phase 5:** Knowledge Base schema/API, ticket–article links, Admin SLA rules API, Admin catalog write APIs.

---

## Phase Plans

| Phase | Focus | Days | File |
|---|---|---|---|
| **Phase 1** | Foundation & Architecture | Days 1–5 (Week 1) | [phase1.md](./phase1.md) |
| **Phase 2** | Realtime, Queues & Core Middleware | Days 6–10 (Week 2) | [phase2.md](./phase2.md) |
| **Phase 3** | Workflows, Automation & Hardening | Days 11–15 (Week 3) | [phase3.md](./phase3.md) |
| **Phase 4** | Security Pass, Load Testing & Production Deploy | Days 16–20 (Week 4) | [phase4.md](./phase4.md) |
| **Phase 5** | Knowledge Base API, SLA Rules API & Catalog Writes | Days 21–25 (Week 5) | [phase5.md](./phase5.md) |
| **Phase 6** | Projects, Manager, ProjectAccessService & Admin user CRUD APIs | Days 26–30 (Week 6) | [phase6.md](./phase6.md) |
| **Phase 7** | Incident/catalog subcategory + seed | — | [phase7.md](./phase7.md) |
| **Phase 8** | Two-step approval + dashboard report API | — | [phase8.md](./phase8.md) |

Coverage: [coverage-matrix.md](../coverage-matrix.md). Phase 6 design: [../phase6.md](../phase6.md).

**Local demo data:** After `pnpm --filter server db:seed`, Agent and EndUser tabs are filled via `[Demo]` fixtures — see [demo-accounts.md](./demo-accounts.md).
