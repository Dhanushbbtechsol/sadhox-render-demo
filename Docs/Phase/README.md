# Track-Wise Phase Execution Plan (4 Devs)

This directory contains the detailed phase-by-phase execution plan for the Sadhox ITSM platform.

**Requirements coverage (Phases 1–4 vs Phase 5 gaps):** [coverage-matrix.md](./coverage-matrix.md)

## Track Distribution

| Track Folder | Developer | Role | Ownership Scope |
|---|---|---|---|
| [Dev D](./Dev%20D/plan.md) | **Dev D (Backend Lead)** | Backend Exclusive | Core API, Auth (Passport JWT/RBAC), Database (Drizzle/Postgres), Realtime (Socket.io), Queues (BullMQ/Redis), Infra (CI/CD, Railway/Render, Sentry), Phase 5 Knowledge/SLA/catalog APIs. |
| [Dev A](./Dev%20A/plan.md) | **Dev A** | Full-Stack | Incident Management, Priority Auto-Calc, Round-Robin Assignment, Problem Management, Real-Time Comments, Phase 5 ticket–KB links & portal detail. |
| [Dev B](./Dev%20B/plan.md) | **Dev B** | Full-Stack | Service Catalog, Service Request Fulfillment, Change Management, Phase 5 End User KB portal & catalog Admin CRUD. |
| [Dev C](./Dev%20C/plan.md) | **Dev C** | Full-Stack | Asset Register, Admin Metrics Dashboard, Resend Templates, Audit Log UI, Phase 5 Admin KB authoring, SLA table, CSV export. |

---

## Milestone Timeline

```
Week 1 (Days 1–5):   Foundation & Architecture (Auth, DB Schema, Swagger Stubs, React Scaffold)
Week 2 (Days 6–10):  Core CRUD & Realtime (All Module APIs & UIs, Socket.io, Audit Middleware)
Week 3 (Days 11–15): Workflows & Automation (SLA Workers, Round-Robin, Approvals, Resend Emails)
Week 4 (Days 16–20): QA, Security Pass, Load Testing, Production Go-Live
Week 5 (Days 21–25): Knowledge Base + residual gaps (portal detail, catalog CRUD, SLA table, CSV)
```

## Critical Cross-Track Dependencies (Blockers)

1. **Day 2 (Dev D → Devs A, B, C):** Dev D publishes OpenAPI/Swagger contract and Drizzle schemas so Devs A, B, C can build against stubs immediately.
2. **Day 3 (Dev D → Devs A, B, C):** Dev D delivers functional `/auth/login`, `/auth/refresh`, and `@Roles()` guards.
3. **Day 5 (All Devs):** Frontend Auth Context merged; protected route navigation verified against staging database (**Checkpoint 1**).
4. **Day 10 (Dev D → Devs A, B, C):** Socket.io gateway and BullMQ queue infrastructure live on staging (**Checkpoint 2**).
5. **Day 15 (All Devs):** Green RBAC e2e test suite (401/403 matrix) and background jobs functional (**Checkpoint 3**).
6. **Day 20 (All Devs):** Production Go-Live on Railway/Render (Backend+DB+Redis) and Vercel (Frontend).
7. **Day 22–23 (Dev D → Devs A, B, C):** Knowledge Base + SLA rules + catalog write APIs frozen for Phase 5 UI work (**Checkpoint 5**).
