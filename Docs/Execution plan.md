# Execution Plan — Custom Backend, Production Build (4 Devs, ~4 Weeks)

### 1. Module Ownership

| Developer | Ownership | Responsibilities | Track Plan |
|---|---|---|---|
| **Dev D (Backend Lead, backend-exclusive)** | Core API, Auth, Infra | NestJS project setup, Drizzle schema/migrations, JWT auth + refresh tokens, RBAC guards, Socket.io gateway, BullMQ jobs (SLA/auto-close/email), CI/CD, staging+prod deploy, Sentry/logging setup, audit log. | [Dev D Plan](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/plan.md) |
| **Dev A** | Incidents & Problems (full-stack) | Nest module: incident/problem CRUD, priority auto-calc service, round-robin assignment logic, comment endpoints. React UI for same. | [Dev A Plan](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/plan.md) |
| **Dev B** | Service Requests & Changes (full-stack) | Nest module: catalog, request/approval workflow, change records. React UI for same. | [Dev B Plan](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/plan.md) |
| **Dev C** | Assets, Admin, Automation UI (full-stack) | Nest module: asset register, admin aggregate endpoints. React admin dashboard, charts, Resend email templates. | [Dev C Plan](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/plan.md) |

Devs A–C build against Dev D's API contract (Swagger-documented) from day 2 onward — Dev D ships auth + schema + a stub/mock API first so others aren't blocked.

---

### 2. Week-by-Week Plan (4 weeks, ~20 working days)

**Week 1 — Foundation**
- Dev D: Nest project scaffold, Drizzle schema + migrations for all tables, JWT auth (login/refresh/logout), RBAC guard/decorator framework, Swagger docs live, CI pipeline (lint+test on PR).
- Devs A/B/C: React+Vite+Tailwind+shadcn scaffold, routing, auth context wired to Dev D's `/auth` endpoints, build against Swagger stub for their module's CRUD.
- **Checkpoint (Day 5):** Auth works end-to-end (login → protected route → role check). Schema migrated on staging DB.

**Week 2 — Core CRUD + Realtime**
- Dev D: Socket.io gateway for comments, BullMQ+Redis wired (jobs not yet firing real logic), audit log middleware.
- Dev A: Incident/Problem CRUD complete, priority auto-calc, comment endpoints + realtime UI wired.
- Dev B: Service Request + Change CRUD complete, approval endpoints.
- Dev C: Asset CRUD complete, admin dashboard skeleton + basic queries.
- **Checkpoint (Day 10):** All modules CRUD-complete against real DB with RBAC enforced (e2e tests passing for role access per endpoint).

**Week 3 — Workflows, Automation, Hardening**
- Dev D: Round-robin assignment RPC→service logic (support Dev A), SLA breach + auto-close BullMQ jobs live, Resend integration wired into ticket assignment/status-change service calls, rate limiting (@nestjs/throttler).
- Dev A: Round-robin UI, status workflow (New→Closed) enforcement, e2e tests for incident module.
- Dev B: Approval workflow state machine, e2e tests for service/change modules.
- Dev C: Admin dashboard charts hooked to real aggregate data, e2e tests for asset module.
- **Checkpoint (Day 15):** Automation live (emails send, SLA jobs run, realtime works). Test coverage baseline met per module.

**Week 4 — QA, Security Pass, Deploy**
- All devs: Cross-module QA, fix bugs, validate RBAC on every route (401/403 test matrix), load-test critical endpoints (assignment, comment creation).
- Dev D: Production deploy (Railway/Render backend+DB+Redis, Vercel frontend), env var/secrets audit, Sentry alerting confirmed, backup/restore check on Postgres.
- Seed script for realistic demo/UAT data (kept from original plan).
- **GO LIVE (Day 20):** Production URL live, monitoring active, credentials issued to client.

---

### 3. Dependency Flags (Blockers)
- 🚩 **Day 3:** Dev D must ship working auth + RBAC guard pattern before Devs A–C can gate their routes — this is now the hard blocker.
- 🚩 **Day 5:** Frontend auth context must be merged before any module UI work continues past stubs.
- 🚩 **Day 10:** Status value naming (`status` enums) must be standardized across Incidents/Requests/Changes before Dev D wires the shared email-notification service.
- 🚩 **Day 15:** RBAC e2e test matrix must be green before Week 4 QA starts — this is a hard gate, not polish.

---

### 4. Definition of Done (Milestones)
- **Week 1 — Scaffolded:** Auth works, schema migrated, CI running, all 4 devs unblocked.
- **Week 2 — Functional:** Full CRUD across all modules, RBAC enforced and tested.
- **Week 3 — Automated & Hardened:** Realtime, SLA jobs, emails, round-robin, approval workflows all live; test coverage in place.
- **Week 4 — Production-Ready (Shipped):** Deployed, monitored, load-tested, seeded, zero unhandled errors across a full ITIL workflow walkthrough.