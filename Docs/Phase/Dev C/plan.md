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

---

## Phase Plans

| Phase | Focus | Days | File |
|---|---|---|---|
| **Phase 1** | Foundation, Admin Shell & Stubs | Days 1–5 (Week 1) | [phase1.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase1.md) |
| **Phase 2** | Asset Register CRUD & Dashboard Aggregates | Days 6–10 (Week 2) | [phase2.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase2.md) |
| **Phase 3** | Charts, Resend Email Templates & Audit Viewer | Days 11–15 (Week 3) | [phase3.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase3.md) |
| **Phase 4** | QA, Security Pass & Deploy | Days 16–20 (Week 4) | [phase4.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase4.md) |
