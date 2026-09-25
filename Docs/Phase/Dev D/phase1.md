# Dev D — Phase 1: Foundation & Architecture (Week 1 / Days 1–5)

**Goal:** Scaffold NestJS project, deploy Drizzle schema, publish Swagger mock API, and deliver working JWT/RBAC auth so Devs A, B, and C are unblocked by Day 5.

---

- **Day 1: Project Scaffold & Database Wiring**
  - Scaffold NestJS in `apps/server` with TypeScript strict mode.
  - Setup Drizzle ORM + PostgreSQL client (`pg`/`postgres`) with connection pooling and health checks.
  - Configure environment configuration service (`@nestjs/config`) with Zod/Joi schema validation.
  - Setup `drizzle-kit` configuration for migration management.

- **Day 2: Core Data Schema & Migrations**
  - Implement complete Drizzle schema for all tables:
    - `users` (id, email, password_hash, role: enum['Admin','Agent','EndUser'], name, created_at, updated_at)
    - `refresh_tokens` (id, user_id, token_hash, expires_at, revoked, created_at)
    - `audit_log` (id, actor_id, action, entity_type, entity_id, diff, created_at)
    - `incidents`, `problems`, `service_requests`, `changes`, `assets`, `comments`, `sla_rules`, `notifications`.
  - Run initial migration on local and staging PostgreSQL instances.
  - Create database seed utility for initial admin and agent accounts.

- **Day 3: Authentication Module (JWT + Refresh Tokens)**
  - Implement `AuthModule` with Passport.js:
    - `POST /auth/login`: Validates credentials (bcrypt), issues short-lived JWT access token (15m) + secure httpOnly cookie with refresh token (7d).
    - `POST /auth/refresh`: Validates refresh token against `refresh_tokens` table, issues new access token + rotates refresh token.
    - `POST /auth/logout`: Revokes refresh token in database, clears cookie.
  - Unit tests for password hashing, token generation, and token rotation.

- **Day 4: RBAC Guard Framework & Swagger Contract**
  - Build custom authorization decorators: `@Roles('Admin', 'Agent', 'EndUser')` and `@Public()`.
  - Implement `JwtAuthGuard` and `RolesGuard` to validate JWT claims and enforce route permissions.
  - Configure `@nestjs/swagger` with OpenAPI 3.0 specification.
  - Stub endpoints for Incidents, Problems, Service Requests, Changes, and Assets so Devs A, B, and C can begin building without waiting for business logic.

- **Day 5: CI Pipeline & Staging Deploy (Checkpoint 1)**
  - Build GitHub Actions workflow: lint, TypeScript type-check, unit tests.
  - Deploy staging backend to Railway/Render connected to staging PostgreSQL.
  - **✅ Checkpoint 1:** Devs A, B, and C can log in via `/auth/login`, access protected routes, and receive 401/403 appropriately.

---

**Next →** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase2.md)
