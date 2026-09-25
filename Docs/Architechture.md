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
Same core entities as before (`users`, `incidents`, `problems`, `service_requests`, `changes`, `assets`, `comments`), now defined as Drizzle schema + migrations instead of Supabase tables.
* Add `refresh_tokens` table (id, user_id, token_hash, expires_at, revoked) — needed since we manage our own sessions.
* Add `audit_log` table (id, actor_id, action, entity_type, entity_id, created_at, diff) — required for production traceability, wasn't in the demo scope.
* `comments` stays polymorphic (`ticket_id` + `ticket_type`); enforce referential integrity via a Nest service-layer check + cascading soft-delete job, since Postgres can't FK across types.

### 3. Core API Endpoints (replaces Supabase RPC/PostgREST)
* `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
* `GET/POST/PATCH /incidents`, `/incidents/:id/assign` (round-robin logic in service)
* Priority auto-calc: computed in `IncidentsService.create()`/`.update()`, not a DB trigger
* `GET/POST/PATCH /problems`, `/service-requests`, `/changes`, `/assets`
* `POST /comments` → persists + emits Socket.io event
* `GET /admin/dashboard` → aggregate queries for ticket counts by status/module
* All endpoints behind `@UseGuards(JwtAuthGuard, RolesGuard)`

### 4. Security & Scalability (updated risk set)
* **Auth risk (new, replaces RLS risk):** Since Postgres itself is not the enforcement point, authorization bugs in Nest guards = full risk. *Mitigation:* RBAC guard unit-tested per role per route; e2e test suite asserts 403s for wrong-role access on every endpoint before deploy.
* **Session risk (new):** Refresh token theft/replay. *Mitigation:* httpOnly + secure cookies, token rotation on refresh, revoke-on-logout table check.
* **Polymorphic comments:** same mitigation as before (service-layer validation, cascading cleanup job) — now enforced in Nest instead of Postgres triggers.
* **Job reliability (new):** BullMQ job failures (SLA/auto-close) silently missed. *Mitigation:* Failed-job alerting via Sentry, dead-letter queue inspection in admin dashboard.
* **Third-Party Risk - Resend limits:** same as before; verify sending domain before go-live rather than sandboxing.

---