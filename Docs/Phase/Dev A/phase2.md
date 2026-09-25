# Dev A — Phase 2: Core CRUD & Realtime Comments (Week 2 / Days 6–10)

**Goal:** Implement full backend CRUD for Incidents and Problems, connect live database, and enable real-time comments via Socket.io.

---

- **Day 6: Backend Incidents CRUD (`IncidentsModule`)**
  - Implement `IncidentsController` and `IncidentsService`.
  - Endpoints:
    - `GET /incidents`: Paginated list with filters (status, priority, assigned_to, reporter_id).
    - `POST /incidents`: Ticket creation with DTO validation (`class-validator`).
    - `GET /incidents/:id`: Detailed view including reporter, assignee, and SLA target.

- **Day 7: Priority Auto-Calculation & Status Updates**
  - Implement `PriorityCalculationService`:
    - Matrix: High×High = P1 (Critical), High×Med/Med×High = P2 (High), Med×Med/Low×High = P3 (Medium), others = P4 (Low).
    - SLA resolution due time calculated based on priority (P1 = 4h, P2 = 8h, P3 = 24h, P4 = 72h).
  - Endpoint: `PATCH /incidents/:id` for field updates with role gating.

- **Day 8: Problem Management Module (`ProblemsModule`)**
  - Backend: `GET /problems`, `POST /problems`, `PATCH /problems/:id`.
  - Problem fields: Title, Description, Root Cause analysis, Known Error flag, Status (`Open`, `Under Investigation`, `Workaround Found`, `Resolved`).
  - Join table / relation: link one Problem to multiple Incident records.

- **Day 9: Real-Time Comments via Socket.io**
  - Backend: `POST /incidents/:id/comments` and `GET /incidents/:id/comments`.
  - Service emits `comment.created` to Socket.io room `ticket:${id}` via Dev D's `EventsGateway`.
  - Frontend: Socket.io client subscribes on incident detail mount, appending incoming comments to discussion feed without page refresh.

- **Day 10: Frontend Ticket Detail & List Integration (Checkpoint 2)**
  - Wire React components to live backend endpoints.
  - Render Incident list table with sorting, status pill badges, and priority indicators.
  - Add Supertest API integration tests for Incident and Problem endpoints.
  - **✅ Checkpoint 2:** Full Incident and Problem CRUD working against PostgreSQL; comments update in real-time.

---

**← Previous:** [Phase 1](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase1.md) | **Next →** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase3.md)
