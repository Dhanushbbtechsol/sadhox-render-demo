# Dev B — Phase 3: Workflow State Machines, Comments & Emails (Week 3 / Days 11–15)

**Goal:** Complete request fulfillment workflows, integrate polymorphic comments, and trigger transactional approval emails.

---

- **Day 11: Request Fulfillment State Machine**
  - Enforce fulfillment transitions after approval:
    - `Approved` → `In Fulfillment` (Agent takes ownership)
    - `In Fulfillment` → `Fulfilled` (Agent closes request with completion notes)
  - Prevent fulfillment before Admin approval is granted.

- **Day 12: Change Scheduling & Rollback Viewer UI**
  - Build interactive Change Calendar/Timeline view in React showing scheduled maintenance windows.
  - Build dedicated Rollback Plan tab on Change details page ensuring rollback steps are clearly visible before implementation.

- **Day 13: Polymorphic Comments Integration**
  - Wire discussion feeds on Service Request and Change detail pages using Dev D's polymorphic comments endpoint (`POST /comments` with `ticket_type='service_request'|'change'`).
  - Connect Socket.io client to subscribe to `ticket:${id}` room for live comment streaming.

- **Day 14: Approval Email Notifications via Resend**
  - On request approval/rejection: dispatch event to Dev D's `MailService` to notify requester of decision.
  - On change submission: dispatch notification to Admin team requesting review.

- **Day 15: Unit Tests & Cross-Track Verification (Checkpoint 3)**
  - Unit tests verifying approval guards prevent unauthorized approval by EndUsers or regular Agents.
  - Run Supertest tests asserting 403 on `/service-requests/:id/approve` for non-Admin roles.
  - **✅ Checkpoint 3:** Full end-to-end request and change lifecycles working; emails dispatching; realtime comments active.

---

**← Previous:** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase2.md) | **Next →** [Phase 4](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase4.md)
