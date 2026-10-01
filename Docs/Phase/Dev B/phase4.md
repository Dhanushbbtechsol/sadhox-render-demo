# Dev B — Phase 4: QA, Security Pass & Deploy (Week 4 / Days 16–20)

**Goal:** End-to-end workflow verification, RBAC penetration checks, and production deployment.

**Checkpoint:** [checkpoint4.md](./checkpoint4.md)

---

- **Day 16: Cross-Module QA Walkthrough**
  - Walkthrough 1: EndUser requests new laptop → Admin receives approval notification → Admin approves → Agent fulfills → Requester receives confirmation email.
  - Walkthrough 2: Agent creates Normal Change with scheduled downtime and rollback plan → Admin approves change → Status advances to Implemented.
  - Script: `apps/server/scripts/checkpoint4-walkthrough.mjs`

- **Day 17: Security Audit & State Validation**
  - Confirm EndUser cannot tamper with approval status payloads.
  - Verify that mandatory rollback plan cannot be left empty on Normal and Emergency changes.
  - Validate date range integrity (Scheduled End must be after Scheduled Start).

- **Day 18: UI Polish & Edge Case Handling**
  - Empty-state illustrations for approval inbox and catalog categories.
  - Confirmation modals for rejection actions requiring mandatory reason input.
  - Toast feedback upon successful request submission and status updates.

- **Day 19: Staging Seed Data Validation**
  - Validate catalog items and historical change requests with realistic seed data.

- **Day 20: Production Go-Live**
  - Verify production frontend build and backend endpoints.
  - Confirm approval emails route properly through production Resend domain. **🚀 Shipped.**

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| `/auth/*` & `@Roles('Admin')` | Dev D | Required to protect approval endpoints from unauthorized execution. |
| `EventsGateway` | Dev D | Required for real-time comment updates on change and request pages. |
| `MailService` | Dev D | Required to notify requesters on approval or rejection. |
| `audit_log` | Dev D | Captures approval actions and change status modifications. |

---

**← Previous:** [Phase 3](./phase3.md)
