# Dev A Track — Incidents & Problems (Full-Stack)

**Developer:** Dev A  
**Role:** Full-Stack Engineer (Incident & Problem Management)  
**Tech Stack:** React (Vite), Tailwind CSS, shadcn/ui, React Query, Zustand, NestJS, Drizzle ORM, Socket.io Client, Jest, Supertest

---

## Ownership & Scope
- **Backend:** NestJS `IncidentsModule` and `ProblemsModule`, Priority calculation service, comment endpoints integration, and incident-problem relation logic.
- **Frontend:** React views for Incident queues, ticket creation wizard, incident detail dashboard, live comment feed, SLA countdown timer, and Problem management views.
- **Business Logic:**
  - Automatic priority calculation (Impact × Urgency matrix: P1–P4).
  - Incident lifecycle state machine (`New` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
  - Round-robin agent assignment integration.
  - Multi-incident linking to Problem root-cause records.
  - Real-time comment updates via Socket.io.

---

## Phase Plans

| Phase | Focus | Days | File |
|---|---|---|---|
| **Phase 1** | Foundation, UI Shell & Stubs | Days 1–5 (Week 1) | [phase1.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase1.md) |
| **Phase 2** | Core CRUD & Realtime Comments | Days 6–10 (Week 2) | [phase2.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase2.md) |
| **Phase 3** | Workflows, Round-Robin & UI Polish | Days 11–15 (Week 3) | [phase3.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase3.md) |
| **Phase 4** | QA, Security Pass & Deploy | Days 16–20 (Week 4) | [phase4.md](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase4.md) |
