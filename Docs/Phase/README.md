# Track-Wise Phase Execution Plan (4 Devs)

This directory contains the detailed phase-by-phase execution plan for the Sadhox ITSM platform.

**Current status (what shipped on `Audit`):** [../STATUS.md](../STATUS.md)  
**Phase 6:** [phase6.md](./phase6.md)  
**Phase 7 (EndUser desk — designed):** [phase7.md](./phase7.md)  
**Phase 8:** superseded by Phase 9.  
**Phase 9 (dev-wise plan):** [phase9.md](./phase9.md) — [Dev D](./Dev%20D/phase9.md) · [Dev A](./Dev%20A/phase9.md) · [Dev B](./Dev%20B/phase9.md) · [Dev C](./Dev%20C/phase9.md)  
**Requirements coverage (Phases 1–4 vs Phase 5 gaps):** [coverage-matrix.md](./coverage-matrix.md)  
**Latest audit:** [../Audit/phase5.md](../Audit/phase5.md)

## Track Distribution

| Track Folder | Developer | Role | Ownership Scope |
|---|---|---|---|
| [Dev D](./Dev%20D/plan.md) | **Dev D (Backend Lead)** | Backend Exclusive | Core API, Auth, Drizzle, Socket.io, BullMQ, Infra; Phase 5 Knowledge/SLA/catalog APIs; **Phase 6 projects + Manager + ProjectAccessService + Admin user CRUD APIs**. |
| [Dev A](./Dev%20A/plan.md) | **Dev A** | Full-Stack | Incidents, Problems, assignment/comments; Phase 5 KB links & portal detail; **Phase 6 project-scoped tickets + assignment pool**. |
| [Dev B](./Dev%20B/plan.md) | **Dev B** | Full-Stack | Catalog, Requests, Changes; Phase 5 KB portal & catalog Admin; **Phase 6 project fields + Manager approvals**. |
| [Dev C](./Dev%20C/plan.md) | **Dev C** | Full-Stack | Assets, Admin dashboards; Phase 5 KB authoring / SLA UI / CSV; **Phase 6 Admin projects UI + Manager views + Admin `/admin/users`**. |

---

## Milestone Timeline

```
Week 1 (Days 1–5):   Foundation & Architecture (Auth, DB Schema, Swagger Stubs, React Scaffold)
Week 2 (Days 6–10):  Core CRUD & Realtime (All Module APIs & UIs, Socket.io, Audit Middleware)
Week 3 (Days 11–15): Workflows & Automation (SLA Workers, Round-Robin, Approvals, Resend Emails)
Week 4 (Days 16–20): QA, Security Pass, Load Testing, Production Go-Live
Week 5 (Days 21–25): Knowledge Base + residual gaps (portal detail, catalog CRUD, SLA table, CSV)
Week 6 (Days 26–30): Projects / Modules / Manager + project ACL & assignment + Admin User Management
Week 7:            EndUser desk — Incidents replaces My Portal; Service Catalog / Service Requests labels; subcategory + seed (phase7.md)
Week 8:            Superseded by Phase 9
Week 9:            Org chart, manager-then-admin approvals, escalation, notices, desk report, asset assignment (phase9.md)
```

## Critical Cross-Track Dependencies (Blockers)

1. **Day 2 (Dev D → Devs A, B, C):** Dev D publishes OpenAPI/Swagger contract and Drizzle schemas so Devs A, B, C can build against stubs immediately.
2. **Day 3 (Dev D → Devs A, B, C):** Dev D delivers functional `/auth/login`, `/auth/refresh`, and `@Roles()` guards.
3. **Day 5 (All Devs):** Frontend Auth Context merged; protected route navigation verified against staging database (**Checkpoint 1**).
4. **Day 10 (Dev D → Devs A, B, C):** Socket.io gateway and BullMQ queue infrastructure live on staging (**Checkpoint 2**).
5. **Day 15 (All Devs):** Green RBAC e2e test suite (401/403 matrix) and background jobs functional (**Checkpoint 3**).
6. **Day 20 (All Devs):** Production Go-Live on Railway/Render (Backend+DB+Redis) and Vercel (Frontend).
7. **Day 22–23 (Dev D → Devs A, B, C):** Knowledge Base + SLA rules + catalog write APIs frozen for Phase 5 UI work (**Checkpoint 5**).
8. **Day 26 (All):** Phase 5 Medium gaps closed before Phase 6 schema lands (**Checkpoint 6 gate**).
9. **Day 28–29 (Dev D → A, B, C):** `ProjectAccessService` + projects OpenAPI frozen for UI (**Checkpoint 6**).
