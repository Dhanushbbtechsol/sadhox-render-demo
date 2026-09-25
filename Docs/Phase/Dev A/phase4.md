# Dev A — Phase 4: QA, Security Pass & Deploy (Week 4 / Days 16–20)

**Goal:** Cross-module walkthroughs, authorization audits, performance optimization, and production verification.

---

- **Day 16: Cross-Module QA Walkthrough**
  - Walkthrough: EndUser reports incident → Auto-calculated P2 → Auto-assigned via round-robin to Agent → Agent comments in real-time → Agent links to Problem → Resolves with notes.
  - Fix edge-case UI glitches and race conditions in comment stream.

- **Day 17: Security Pass & RBAC Audit**
  - Verify RBAC boundaries:
    - EndUser attempting `PATCH /incidents/:id/assign` receives 403 Forbidden.
    - EndUser attempting `POST /problems` receives 403 Forbidden.
  - Test input sanitation on comment submissions (prevent XSS in comment HTML).

- **Day 18: UI Polish & Mobile Responsiveness**
  - Optimize ticket table performance on large lists (virtualized scrolling or clean pagination).
  - Responsive layout check for tablets and smaller screens.
  - Keyboard navigation for quick ticket status updates.

- **Day 19: Staging Seed Data Validation**
  - Run end-to-end tests against staging database loaded with realistic seed incidents (P1 through P4 across all statuses).

- **Day 20: Production Go-Live**
  - Verify production frontend build on Vercel connecting to production API.
  - Verify live Socket.io comment delivery and email dispatch on production. **🚀 Shipped.**

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| `/auth/*` & `@Roles()` | Dev D | Required for user authentication, role extraction, and endpoint gating. |
| `EventsGateway` | Dev D | Required for real-time comment broadcasting on `ticket:${id}` room. |
| `AssignmentService` | Dev D | Required for round-robin auto-assignment logic. |
| `MailService` | Dev D | Required to trigger email notifications when an incident is assigned. |
| Asset Link | Dev C | Junction reference allowing an incident to be associated with an asset ID. |

---

**← Previous:** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase3.md)
