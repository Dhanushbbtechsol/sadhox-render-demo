# Dev D — Phase 4: Security Pass, Load Testing & Production Deploy (Week 4 / Days 16–20)

**Goal:** Execute full security audits, load tests, production infrastructure cutover, and monitoring go-live.

---

- **Day 16: Security Audit & 401/403 Test Matrix**
  - Execute automated Supertest test matrix:
    - Assert EndUser receives 403 on Admin/Agent routes.
    - Assert Agent receives 403 on Admin routes.
    - Assert unauthenticated requests receive 401.
  - Verify cookie security flags: `HttpOnly`; production cross-site refresh uses `SameSite=None; Secure` (Vercel ↔ Render/Railway). See [cross-site-refresh-cookie.md](./cross-site-refresh-cookie.md).
  - Verify CORS whitelist restricting access to production frontend domain.

- **Day 17: Concurrency & Load Testing**
  - Run load tests using `k6` or `autocannon`:
    - Concurrent ticket creation and list queries under 100 req/sec.
    - Socket.io connection scaling (50+ concurrent room subscribers).
  - Tune PostgreSQL connection pool and Redis connection limits.

- **Day 18: Production Infrastructure Provisioning**
  - Provision production PostgreSQL, Redis (Key Value), and NestJS web service on **Render** (Blueprint: root `render.yaml`).
  - Configure production secrets, Sentry DSN, Resend API production keys, and production CORS (`CORS_ORIGIN` = exact Vercel origin).
  - Run production database migrations (manual runbook — explicit go-ahead required).
  - Prep docs: `Docs/production-env-checklist.md`, `Docs/Phase/Dev D/production-migration-runbook.md`.

- **Day 19: Backup Rehearsal & Production Seeding**
  - Test PostgreSQL automated backup creation and point-in-time restore procedure.
  - Run production seed script to populate default admin account, baseline SLA rules, and service catalog categories.
  - Prep (only): [backup-restore-runbook.md](./backup-restore-runbook.md), [day19-seed-prep.md](./day19-seed-prep.md), `apps/server/scripts/seed-production.ts`.

- **Day 20: Production Go-Live & Verification**
  - Verify production API health endpoints and Vercel frontend connectivity.
  - Confirm real-time Sentry alert delivery and BullMQ job activity.
  - Hand over admin credentials to stakeholders. **🚀 Shipped.**
  - Prep (only): [go-live-checklist.md](./go-live-checklist.md).

---

## Interfaces & Contracts Provided to Other Tracks

| Service / Interface | Consumers | Description |
|---|---|---|
| `POST /auth/login, /refresh, /logout` | Devs A, B, C | User authentication, token issuance, and session termination. |
| `@Roles(...)`, `RolesGuard`, `JwtAuthGuard` | Devs A, B, C | NestJS decorators to protect module routes by role. |
| `EventsGateway` (`ticket:{id}` room) | Devs A, B | WebSocket channel to broadcast comment and status updates. |
| `MailService` (`email-queue`) | Devs A, B, C | Dispatches transactional emails via background workers. |
| `AssignmentService.assignNextAgent()` | Dev A | Auto-assigns tickets to agents using least-loaded agent selection with advisory-lock concurrency safety. |
| `audit_log` Table & Interceptor | Dev C | Captures system-wide change history for Admin UI consumption. |

---

**← Previous:** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase3.md)
