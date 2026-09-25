# Dev C — Phase 3: Charts, Resend Email Templates & Audit Viewer (Week 3 / Days 11–15)

**Goal:** Polish interactive charts, implement production-grade HTML email templates for Resend, and build Audit Log UI.

---

- **Day 11: Interactive Dashboard Charts & Filters**
  - Implement interactive Recharts components:
    - Ticket Volume by Module (stacked bar chart).
    - Status Distribution (donut chart).
    - SLA Compliance Rate (gauge or progress bar).
  - Add date-range picker filter (Last 7 Days, Last 30 Days, Year-to-Date).

- **Day 12: Production Resend HTML Email Templates**
  - Build responsive, branded HTML email templates (using React Email or inline CSS):
    - **Ticket Assigned Template:** Ticket ID, Priority badge, Title, Link to view ticket.
    - **Status Changed Template:** Previous status → New status, updated by actor, remarks.
    - **SLA Breach Alert Template:** Prominent red warning banner, SLA target missed, escalation notes.
    - **Request Decision Template:** Approval or rejection status with comments.
  - Deliver templates to Dev D's `MailService`.

- **Day 13: System Audit Log Viewer UI**
  - Endpoint: `GET /admin/audit-logs` (paginated, filtered by actor and date).
  - Build Audit Log inspector in React:
    - Timeline view of mutating actions.
    - JSON diff viewer showing before and after states of updated entities.

- **Day 14: Background Worker Health Monitor UI**
  - Build simple Admin view showing BullMQ queue status (active, completed, failed jobs) queried from Dev D's health endpoints.
  - Displays alert banner if Redis queue reports stalled or failed jobs.

- **Day 15: Unit Tests & Cross-Track Verification (Checkpoint 3)**
  - Write unit tests for aggregate SQL queries verifying accurate count calculations.
  - Supertest tests asserting EndUsers and Agents receive 403 when requesting `/admin/*` or `/assets` (write operations).
  - **✅ Checkpoint 3:** Admin charts, email templates, and audit log viewer completely operational.

---

**← Previous:** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase2.md) | **Next →** [Phase 4](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase4.md)
