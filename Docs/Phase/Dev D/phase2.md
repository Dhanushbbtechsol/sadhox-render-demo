# Dev D — Phase 2: Realtime, Queues & Core Middleware (Week 2 / Days 6–10)

**Goal:** Provide Socket.io gateway, BullMQ queue harness, audit log engine, and observability stack for all track consumers.

---

- **Day 6: Socket.io Real-Time Gateway**
  - Implement `EventsGateway` using `@nestjs/websockets` and `socket.io`.
  - Implement WebSocket auth handshake verifying JWT access tokens.
  - Room management: `client.join('ticket:${ticketId}')` and `client.leave('ticket:${ticketId}')`.
  - Event emitter service: helper for other modules to broadcast `comment.created` or `ticket.updated`.

- **Day 7: BullMQ + Redis Infrastructure**
  - Provision Redis instance (local and staging).
  - Configure `@nestjs/bullmq` with connection options, retry strategies, and backoff logic.
  - Define primary queues:
    - `sla-queue` (repeatable SLA breach evaluator)
    - `ticket-lifecycle-queue` (auto-close worker)
    - `email-queue` (transactional email dispatcher)

- **Day 8: Audit Log Interceptor & Middleware**
  - Build global `AuditLogInterceptor` targeting mutating routes (`POST`, `PATCH`, `DELETE`).
  - Automatically capture: `actor_id` (from JWT), `action`, `entity_type`, `entity_id`, and `diff` payload.
  - Persist entries to `audit_log` asynchronously without blocking HTTP request execution.

- **Day 9: Resend Email Service Integration**
  - Build `MailModule` wrapping Resend API SDK.
  - Implement BullMQ worker processor for `email-queue` with exponential backoff retries.
  - Provide typed email dispatch interface: `mailService.sendTicketAssigned(to, data)`, `mailService.sendSlaBreach(to, data)`.

- **Day 10: Observability, Logging & Error Tracking (Checkpoint 2)**
  - Configure `nestjs-pino` for structured JSON logging with incoming request correlation IDs (`x-request-id`).
  - Configure `@sentry/node` global exception filter capturing unhandled runtime exceptions.
  - **✅ Checkpoint 2:** Realtime WebSocket connections verify auth; BullMQ connects to Redis; audit logs record mutations; logging and Sentry active on staging.

---

**← Previous:** [Phase 1](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase1.md) | **Next →** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/phase3.md)
