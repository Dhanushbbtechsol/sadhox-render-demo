# Dev A — Phase 3: Workflows, Round-Robin & UI Polish (Week 3 / Days 11–15)

**Goal:** Enforce ITIL status transition state machine, integrate round-robin auto-assignment, and polish Problem management UI.

---

- **Day 11: Agent Assignment & Round-Robin Integration**
  - Endpoint: `POST /incidents/:id/assign`:
    - Manual assignment: Accepts `agentId`.
    - Auto-assignment: Calls Dev D's `AssignmentService.assignNextAgent(ticketId)`.
  - Enqueue email notification to assigned agent via Dev D's `MailService`.
  - Frontend: "Assign to Me" button and Agent selection dropdown.

- **Day 12: Incident Lifecycle State Machine**
  - Enforce valid transitions:
    - `New` → `Assigned` (upon agent assignment)
    - `Assigned` → `In Progress`
    - `In Progress` → `Resolved` (requires Resolution Notes)
    - `Resolved` → `Closed` (requires confirmation or automated close)
  - Prevent illegal jumps (e.g. `New` directly to `Closed` without resolution).

- **Day 13: Problem Management UI**
  - Build Problem List view and Problem Detail page.
  - Add "Known Error" badge and "Link Incidents" modal allowing agents to link related incident tickets.
  - Display list of affected incidents on the Problem detail view.

- **Day 14: SLA Timer Countdown Component**
  - Build React SLA countdown timer component on Incident detail page:
    - Displays remaining time until breach (`sla_due_at`).
    - Visual alerts: Green (> 50% time remaining), Amber (< 25% remaining), Red (Breached).
    - Reacts to `sla_breached` flag updated by Dev D's background job.

- **Day 15: Unit Tests & Cross-Track Verification (Checkpoint 3)**
  - Write Jest tests for priority calculation matrix and status transition guard logic.
  - Run Supertest tests asserting EndUsers cannot close incidents or link problems.
  - **✅ Checkpoint 3:** Complete incident-to-resolution lifecycle functional; round-robin and SLA timer working.

---

**← Previous:** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase2.md) | **Next →** [Phase 4](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase4.md)
