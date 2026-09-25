# Dev D — Phase 3: Workflows, Automation & Hardening (Week 3 / Days 11–15)

**Goal:** Implement round-robin assignment, automated SLA breach detection, auto-close jobs, and rate limiting.

---

- **Day 11: Round-Robin Assignment Service**
  - Build `AssignmentService`: algorithm to select the next eligible IT Support Agent (least-loaded or sequential pointer).
  - Expose programmatic method for Dev A's `IncidentsModule`: `assignNextAgent(ticketId, category)`.
  - Unit tests verifying concurrency safety and fair distribution.

- **Day 12: SLA Breach BullMQ Worker**
  - Implement repeatable BullMQ job running every 5 minutes.
  - Query active tickets (`status NOT IN ('Resolved', 'Closed')`) where `sla_due_at <= NOW()` and `sla_breached = false`.
  - Mark `sla_breached = true`, record audit log entry, and enqueue email alert to `email-queue`.

- **Day 13: Ticket Auto-Close BullMQ Worker**
  - Implement repeatable BullMQ job running once daily (or configurable interval).
  - Query tickets in `Resolved` status where `resolved_at <= NOW() - INTERVAL '3 DAYS'`.
  - Transition status to `Closed`, log system closure in `audit_log`, and broadcast status change via Socket.io.

- **Day 14: Rate Limiting & Health Checks**
  - Configure `@nestjs/throttler` to prevent brute-force attacks:
    - `/auth/login`: 5 requests per minute per IP.
    - Global endpoints: 100 requests per minute per IP.
  - Implement health check endpoints (`/health/live`, `/health/ready`) with DB and Redis ping tests via `@nestjs/terminus`.

- **Day 15: Cross-Track Integration & Hardening (Checkpoint 3)**
  - Integrate and test email triggers with Dev A (incident assignments), Dev B (service approvals), and Dev C (asset notifications).
  - Supertest suite verifying full RBAC matrix across all core endpoints.
  - **✅ Checkpoint 3:** Automated background jobs running stably on staging; email dispatches working; rate limits enforced.

---

**← Previous:** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase2.md) | **Next →** [Phase 4](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase4.md)
