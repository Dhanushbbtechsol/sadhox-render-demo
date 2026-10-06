# Functional Requirements Document

**Timeline:** 4 weeks (~20 working days) | **Team:** 4 developers  
**Frontend:** React (Vite) + Tailwind CSS + shadcn/ui + React Query + Zustand + React Router  
**Backend:** Node.js + NestJS (TypeScript), PostgreSQL + Drizzle ORM, Passport.js (JWT + refresh tokens), BullMQ + Redis, Socket.io, Resend  
**Hosting & Infra:** Vercel (Frontend), Railway / Render (Backend API + PostgreSQL + Redis), GitHub Actions CI/CD  
**Goal:** Production-grade ITSM platform with a modular custom backend, end-to-end ITIL workflows, automated background processing, real-time collaboration, and enterprise-grade security/observability.

---

## 1. Scope (Production Build)
- **In-Scope:** Core ITIL workflows (Incident, Problem, Service Request, Change, Asset), JWT authentication with rotating refresh tokens, granular RBAC route guards, real-time comment streams via WebSockets, time & event-driven automations (BullMQ + Redis), transactional emails (Resend), audit logging, and automated CI/CD with full e2e test verification.
- **Phase 5 (Week 5) in-scope add-on:** Knowledge Base (categories, articles, search, ticket links), Admin Service Catalog CRUD, Admin SLA rules table editor, portal incident detail, dashboard CSV export. See [Docs/Phase/coverage-matrix.md](./Phase/coverage-matrix.md).
- **Out-of-Scope:** Multi-tenant billing architectures, SSO / Active Directory / SAML integrations, advanced BI / drag-and-drop report builders, native mobile applications, and visual CMDB dependency node graphs.

## 2. Modules & Developer Split

### Dev D (Backend Lead, backend-exclusive) — Core API, Auth & Infra
- NestJS project scaffolding, Drizzle ORM schema definitions, and automated migration pipeline.
- Passport.js authentication (JWT access token + secure httpOnly refresh tokens with rotation and revoke-on-logout).
- Custom RBAC guard and decorator framework (`@UseGuards(JwtAuthGuard, RolesGuard)` for `Admin`, `Agent`, `EndUser`).
- Socket.io gateway for real-time ticket comment feeds (`ticket:{id}` rooms).
- BullMQ + Redis worker infrastructure: repeatable jobs for SLA breach detection and resolved ticket auto-closure.
- Resend transactional email service integration.
- System-wide audit log middleware, Pino structured logging, Sentry error tracking, and rate limiting (`@nestjs/throttler`).
- CI/CD pipeline setup (GitHub Actions), Swagger (OpenAPI) docs, and staging/production deployments.

### Dev A (Full-stack) — Incident & Problem Management
- NestJS module & React UI for Incident lifecycle (`New` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
- Priority auto-calculation service (P1–P4 matrix computed from Impact × Urgency on create/update).
- Round-robin agent auto-assignment service and manual assignment actions.
- NestJS module & React UI for Problem records (root-cause documentation, known-error flags, and multi-incident linking).
- Ticket comment endpoints and real-time Socket.io UI integration.
- Unit and e2e integration tests for incident/problem modules.

### Dev B (Full-stack) — Service Request & Change Management
- Predefined, table-driven Service Catalog and request submission portal for End Users.
- Service Request approval workflow state machine (`Submitted` → `Approved` / `Rejected` → `Fulfilled`).
- Change Management module: Change records (`Standard`, `Normal`, `Emergency`), single-level approval workflow, scheduled rollout timestamps, and mandatory rollback plan documentation.
- Unit and e2e integration tests for service request and change modules.

### Dev C (Full-stack) — Assets, Admin & Automation UI
- Asset Management module: CRUD register for hardware and software assets, owner assignment, status tracking, and linked ticket associations.
- Admin dashboard UI with aggregate metric visualisations (ticket volumes by status, module, and SLA state).
- Resend email HTML templates for ticket assignments and status transitions.
- Unit and e2e integration tests for asset and admin analytics modules.
- **Phase 5:** Admin Knowledge Base authoring UI, SLA rules table editor, dashboard CSV export.

### Phase 5 additions (all tracks)
- **Dev D:** `KnowledgeModule` schema/API, ticket–article links, Admin SLA rules PATCH, Admin catalog POST/PATCH.
- **Dev A:** Link articles on incident/problem detail; End User portal incident detail.
- **Dev B:** End User `/knowledge` browse/search; Admin catalog CRUD UI.

## 3. Data Model (PostgreSQL via Drizzle ORM)
- `users`: Core identity, role (`Admin`, `Agent`, `EndUser`), password hash, timestamps.
- `refresh_tokens`: Session persistence (`id`, `user_id`, `token_hash`, `expires_at`, `revoked`).
- `audit_log`: System audit trail (`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `created_at`, `diff`).
- `incidents`: Incident records (`id`, `title`, `description`, `priority`, `impact`, `urgency`, `status`, `assigned_to`, `reporter_id`, `sla_due_at`, `resolved_at`, `closed_at`).
- `problems`: Problem management records (`id`, `title`, `description`, `root_cause`, `known_error`, `status`, `assigned_to`).
- `service_requests`: Request records linked to catalog items with approval states (`id`, `catalog_id`, `requester_id`, `approver_id`, `status`).
- `changes`: Change control records (`id`, `title`, `type`, `scheduled_at`, `rollback_plan`, `status`, `approved_by`).
- `assets`: Hardware/software inventory (`id`, `name`, `type`, `owner_id`, `status`, `linked_ticket_id`).
- `comments`: Polymorphic comments (`id`, `ticket_id`, `ticket_type`, `author_id`, `content`, `created_at`) with Nest service-layer referential validation and cascading soft-delete.
- `sla_rules`: SLA threshold definitions per priority level.
- `notifications`: User notification delivery records.
- **Phase 5:** `knowledge_categories`, `knowledge_articles` (Draft/Published), `ticket_knowledge_links` (polymorphic ticket ↔ article).

## 4. Non-Functional Requirements
- **Security & Authorization:** Passport JWT strategy with httpOnly secure cookies; NestJS RBAC guards enforced across all controllers; 100% test assertion for 401/403 authorization boundaries.
- **Reliability & Background Automation:** BullMQ + Redis running background jobs every 5 minutes for SLA checks and auto-closure; dead-letter queue and Sentry alerts on failed jobs.
- **Real-Time Collaboration:** Socket.io room broadcasting per ticket ID ensuring sub-second message delivery.
- **Observability:** Pino structured logging with contextual request correlation IDs; Sentry integration for real-time error tracking.
- **Testing & Quality:** Jest unit testing + Supertest e2e suite covering critical paths; rate limiting via `@nestjs/throttler`.
- **Infrastructure & CI/CD:** GitHub Actions (linting, tests, build) deploying frontend to Vercel and backend/database/Redis to Railway or Render.
- **Seed Script:** Production-like seed dataset populating users, assets, catalog items, and active ITIL workflows for testing and client evaluation.

## 5. Week-by-Week Milestone Plan
| Week | Focus | Milestones & Checkpoints |
|---|---|---|
| **Week 1** | Foundation & Architecture | Dev 1 sets up NestJS, Drizzle schema, migrations, JWT auth, RBAC guards, Swagger, and CI pipeline. Devs 2–4 scaffold React app, layout, and auth context. **Checkpoint (Day 5):** Auth working end-to-end; schema migrated on staging. |
| **Week 2** | Core CRUD & Realtime | Socket.io gateway and BullMQ/Redis wired. Incident, Problem, Service Request, Change, and Asset modules CRUD complete with real DB access and RBAC guards active. **Checkpoint (Day 10):** All modules functional; e2e role tests passing. |
| **Week 3** | Workflows, Automation & Hardening | Round-robin assignment, BullMQ SLA breach/auto-close jobs, Resend email triggers, approval state machines, and Admin charts live. **Checkpoint (Day 15):** Automation active; test coverage baseline achieved across all modules. |
| **Week 4** | QA, Security Pass & Deploy | Cross-module QA walkthrough, full 401/403 security matrix audit, endpoint load testing, seed data loaded, production deployment to Railway/Render and Vercel. **Checkpoint (Day 20):** Production go-live with active monitoring. |
| **Week 5** | Knowledge Base & residual gaps | KB schema/API + Admin authoring + End User search; ticket–article links; portal incident detail; catalog Admin CRUD; SLA rules table editor; dashboard CSV. **Checkpoint (Day 25):** Phase 5 acceptance per [coverage-matrix.md](./Phase/coverage-matrix.md). |

## 6. Out-of-Scope Follow-ups
- Multi-tenant tenant isolation and billing management.
- Enterprise SSO (SAML 2.0 / Okta / Azure AD).
- Interactive visual CMDB dependency graph.
- Multi-tier conditional approval hierarchies.
- Dynamic drag-and-drop SLA policy configuration UI.
