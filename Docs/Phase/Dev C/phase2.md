# Dev C — Phase 2: Asset Register CRUD & Dashboard Aggregates (Week 2 / Days 6–10)

**Goal:** Implement backend `AssetsModule` and `AdminModule` with PostgreSQL aggregate queries, and wire React views to live data.

---

- **Day 6: Backend Assets CRUD (`AssetsModule`)**
  - Implement `AssetsController` and `AssetsService`.
  - Endpoints:
    - `GET /assets`: Paginated asset list with multi-column filtering.
    - `POST /assets`: Create new asset with validation (`class-validator`).
    - `GET /assets/:id`: Detailed asset record including assignment history.
    - `PATCH /assets/:id`: Update asset metadata or owner.
    - `DELETE /assets/:id`: Soft-delete asset (sets `status='Retired'`).

- **Day 7: Asset-Ticket Association Logic**
  - Endpoint: `POST /assets/:id/link-ticket` and `DELETE /assets/:id/unlink-ticket`.
  - Allow linking an asset to active Incident or Service Request tickets for tracking hardware/software failure trends.

- **Day 8: Backend Executive Metrics Aggregation (`AdminModule`)**
  - Endpoint: `GET /admin/dashboard/stats`:
    - Total tickets, open tickets, P1 incidents, SLA compliance percentage.
    - Computed using single optimized PostgreSQL aggregation query with conditional counts (`COUNT(CASE WHEN ...)`).

- **Day 9: Module Volume & SLA Breakdown Queries**
  - Endpoints:
    - `GET /admin/dashboard/tickets-by-status`: Incident vs Service Request vs Change counts grouped by status.
    - `GET /admin/dashboard/sla-performance`: Weekly SLA breach vs compliance metrics.

- **Day 10: Live Frontend Dashboard Wiring (Checkpoint 2)**
  - Connect React KPI cards and charts to live backend aggregate endpoints.
  - Connect Asset CRUD drawer (create/edit form) to live PostgreSQL database.
  - Add Supertest tests for asset CRUD and admin metrics authorization.
  - **✅ Checkpoint 2:** Real metrics render on Admin Dashboard; full Asset CRUD functional against database.

---

**← Previous:** [Phase 1](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase1.md) | **Next →** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase3.md)
