# Dev C Track — Assets, Admin & Automation UI (Full-Stack)

**Developer:** Dev C  
**Role:** Full-Stack Engineer (Asset Register, Admin Analytics & Automation UI)  
**Tech Stack:** React (Vite), Tailwind CSS, shadcn/ui, Recharts, React Query, Zustand, NestJS, Drizzle ORM, Resend HTML Templates, Jest, Supertest

---

## Ownership & Scope
- **Backend:** NestJS `AssetsModule` and `AdminModule` (aggregate reporting queries and statistics).
- **Frontend:** Asset register inventory table, Asset creation/edit drawer, Admin Executive Dashboard with interactive KPI charts, Audit Log inspector, and BullMQ background worker status viewer.
- **Design & Templates:** Responsive HTML email templates for transactional Resend notifications.
- **Business Logic:**
  - Asset lifecycle management (`Procured`, `Active`, `Under Maintenance`, `Retired`).
  - Association of assets to incidents and service requests.
  - Efficient aggregate SQL queries for ticket distributions, module volumes, and SLA performance.
  - Strict Admin-only route gating for executive dashboard and system logs.
  - **Phase 5:** Admin Knowledge Base authoring; SLA rules table editor; dashboard CSV export.

---

## Phase Plans

| Phase | Focus | Days | File |
|---|---|---|---|
| **Phase 1** | Foundation, Admin Shell & Stubs | Days 1–5 (Week 1) | [phase1.md](./phase1.md) |
| **Phase 2** | Asset Register CRUD & Dashboard Aggregates | Days 6–10 (Week 2) | [phase2.md](./phase2.md) |
| **Phase 3** | Charts, Resend Email Templates & Audit Viewer | Days 11–15 (Week 3) | [phase3.md](./phase3.md) |
| **Phase 4** | QA, Security Pass & Deploy | Days 16–20 (Week 4) | [phase4.md](./phase4.md) |
| **Phase 5** | Admin Knowledge Authoring, SLA Table & CSV Export | Days 21–25 (Week 5) | [phase5.md](./phase5.md) |
| **Phase 6** | Admin Projects UI, Manager views & Admin User Management UI | Days 26–30 (Week 6) | [phase6.md](./phase6.md) |
| **Phase 8** | Superseded by Phase 9 | — | [../phase9.md](../phase9.md) |
| **Phase 9** | Org select, escalation, queues, audit, report, assets, bell | — | [phase9.md](./phase9.md) |

Coverage: [coverage-matrix.md](../coverage-matrix.md). Phase 6 design: [../phase6.md](../phase6.md).
