**Architecture & System Design (Custom Backend, Production Build)**

### 1. High-Level Architecture
* **Client Layer:** React SPA on Vercel. Talks only to the NestJS API (no direct DB access).
* **API Layer:** NestJS REST API (Railway/Render). Controllers → Services → Drizzle repositories. All auth/authorization enforced in Nest guards, not the DB.
* **Auth:** Passport JWT strategy. Access token (short-lived) + refresh token (httpOnly cookie). Role stored in JWT claims; RBAC guard checks role per route/resource.
* **Real-time Layer:** Socket.io gateway. On new comment INSERT, service emits event to room `ticket:{id}`; client subscribes on ticket detail view. Replaces Supabase Realtime.
* **Automation Layer:**
  * *Event-driven:* Service layer directly calls Resend after ticket assignment/status change (no DB webhook needed — it's in-process now).
  * *Time-driven:* BullMQ repeatable job (every 5 min) for SLA breach detection + auto-close, backed by Redis.

### 2. Data Models
Core entities defined as Drizzle schema in `apps/server/src/database/schema` (+ migrations): `users`, `refresh_tokens`, `audit_log`, `incidents`, `problems`, `service_catalog`, `service_requests`, `changes`, `assets`, `comments`, `sla_rules`, `notifications`, plus Phase 5 `knowledge_categories`, `knowledge_articles`, `ticket_knowledge_links`.
* `refresh_tokens` — own sessions (JWT access + rotating refresh).
* `audit_log` — production traceability.
* `comments` / ticket–KB links stay polymorphic (`ticket_id` + `ticket_type`); referential integrity via Nest service-layer checks.

### 3. Core API Endpoints (replaces Supabase RPC/PostgREST)
* `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
* `GET/POST/PATCH /incidents`, `/incidents/:id/assign` (round-robin logic in service)
* Priority auto-calc: computed in `IncidentsService.create()`/`.update()`, not a DB trigger
* `GET/POST/PATCH /problems`, `/service-requests`, `/changes`, `/assets`
* `POST /comments` → persists + emits Socket.io event
* `GET /admin/dashboard/*` → aggregate queries for ticket counts by status/module/SLA
* `GET/POST/PATCH/DELETE /knowledge/*` → categories, articles, ticket–article links (Phase 5)
* `POST/PATCH /service-catalog` → Admin catalog item writes (Phase 5)
* Admin SLA rules `GET`/`PATCH /admin/sla-rules` (by priority; body fallback) — Phase 5
* All endpoints behind `@UseGuards(JwtAuthGuard, RolesGuard)`

### 4. Security & Scalability (updated risk set)
* **Auth risk (new, replaces RLS risk):** Since Postgres itself is not the enforcement point, authorization bugs in Nest guards = full risk. *Mitigation:* RBAC guard unit-tested per role per route; e2e test suite asserts 403s for wrong-role access on every endpoint before deploy.
* **Session risk (new):** Refresh token theft/replay. *Mitigation:* httpOnly + secure cookies, token rotation on refresh, revoke-on-logout table check.
* **Polymorphic comments:** same mitigation as before (service-layer validation, cascading cleanup job) — now enforced in Nest instead of Postgres triggers.
* **Job reliability (new):** BullMQ job failures (SLA/auto-close) silently missed. *Mitigation:* Failed-job alerting via Sentry, dead-letter queue inspection in admin dashboard.
* **Third-Party Risk - Resend limits:** same as before; verify sending domain before go-live rather than sandboxing.

---