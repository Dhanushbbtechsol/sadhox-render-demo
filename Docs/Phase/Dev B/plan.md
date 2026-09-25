# Dev B Track — Service Requests & Changes (Full-Stack)

**Developer:** Dev B  
**Role:** Full-Stack Engineer (Service Catalog, Requests & Change Control)  
**Tech Stack:** React (Vite), Tailwind CSS, shadcn/ui, React Query, Zustand, NestJS, Drizzle ORM, Socket.io Client, Jest, Supertest

---

## Ownership & Scope
- **Backend:** NestJS `ServiceRequestsModule`, `ServiceCatalogModule`, and `ChangesModule`.
- **Frontend:** Service Catalog portal, Request submission wizard, Admin approval inbox, Change management registry, Change scheduling view, and Rollback plan viewer.
- **Business Logic:**
  - Service Request lifecycle state machine (`Submitted` → `Approved` / `Rejected` → `In Fulfillment` → `Fulfilled`).
  - Change Management workflow: Change classification (`Standard`, `Normal`, `Emergency`), schedule conflict validation, and rollback documentation enforcement.
  - Role-gated single-level approval execution by Admins.
  - Polymorphic comment integration on requests and changes.
  - Transactional email dispatch for approvals/rejections via Dev D's email queue.

---

## Phase Plans

| Phase | Focus | Days | File |
|---|---|---|---|
| **Phase 1** | Foundation, Catalog Layout & Stubs | Days 1–5 (Week 1) | [phase1.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase1.md) |
| **Phase 2** | Core CRUD & Approvals Backend | Days 6–10 (Week 2) | [phase2.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase2.md) |
| **Phase 3** | Workflow State Machines, Comments & Emails | Days 11–15 (Week 3) | [phase3.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase3.md) |
| **Phase 4** | QA, Security Pass & Deploy | Days 16–20 (Week 4) | [phase4.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase4.md) |
