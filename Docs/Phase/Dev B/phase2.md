# Dev B — Phase 2: Core CRUD & Approvals Backend (Week 2 / Days 6–10)

**Goal:** Deliver NestJS backend modules for Catalog, Service Requests, and Changes, and connect React components to live PostgreSQL database.

---

- **Day 6: Service Catalog & Request Creation Backend**
  - Implement `ServiceCatalogModule` and `ServiceRequestsModule`.
  - Endpoints:
    - `GET /service-catalog`: List available catalog items.
    - `POST /service-requests`: Submit new request (authenticated EndUser).
    - `GET /service-requests`: List requests (EndUser sees only their own; Admin/Agent sees all).

- **Day 7: Single-Level Approval Workflow Backend**
  - Endpoints:
    - `PATCH /service-requests/:id/approve`: Gated to `@Roles('Admin')`.
    - `PATCH /service-requests/:id/reject`: Gated to `@Roles('Admin')` (requires rejection reason string).
  - Update status and persist `approver_id` and `approved_at` timestamp.

- **Day 8: Change Management Module Backend (`ChangesModule`)**
  - Backend schema and controllers:
    - `POST /changes`: Create change record (fields: Title, Description, Type enum `['Standard', 'Normal', 'Emergency']`, Scheduled Start/End time, Rollback Plan text).
    - `GET /changes`: List all changes with filters by type and status.
    - `GET /changes/:id`: Detailed view.

- **Day 9: Change Approval & Status Transitions Backend**
  - Endpoints:
    - `PATCH /changes/:id/approve`: Admin authorization gate.
    - `PATCH /changes/:id`: Update change status (`Draft` → `Submitted` → `Approved` → `Scheduled` → `Implemented` → `Closed` or `Rolled Back`).

- **Day 10: Live Frontend Wiring & API Tests (Checkpoint 2)**
  - Connect React views to live backend endpoints.
  - Build Admin Approval Inbox table displaying pending service requests and changes with quick Approve/Reject action buttons.
  - Add Supertest API integration tests covering request submission and approval gating.
  - **✅ Checkpoint 2:** Service requests and change records can be created, approved, and updated against PostgreSQL.

---

**← Previous:** [Phase 1](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase1.md) | **Next →** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase3.md)
