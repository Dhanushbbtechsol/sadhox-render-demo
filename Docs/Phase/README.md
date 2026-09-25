# Track-Wise Phase Execution Plan (4 Weeks, 4 Devs)

This directory contains the detailed phase-by-phase execution plan for the 4-week production build of the Sadhox ITSM platform.

## Track Distribution

| Track Folder | Developer | Role | Ownership Scope |
|---|---|---|---|
| [Dev D](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20D/plan.md) | **Dev D (Backend Lead)** | Backend Exclusive | Core API, Auth (Passport JWT/RBAC), Database (Drizzle/Postgres), Realtime (Socket.io), Queues (BullMQ/Redis), Infra (CI/CD, Railway/Render, Sentry). |
| [Dev A](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/plan.md) | **Dev A** | Full-Stack | Incident Management, Priority Auto-Calc, Round-Robin Assignment, Problem Management, Real-Time Comments. |
| [Dev B](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/plan.md) | **Dev B** | Full-Stack | Service Catalog, Service Request Fulfillment Workflow, Change Management (Rollback/Approvals), Request Notifications. |
| [Dev C](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/plan.md) | **Dev C** | Full-Stack | Asset Register (CRUD & Linking), Admin Metrics & Aggregation Dashboard, Resend Email Templates, Audit Log UI. |

---

## 4-Week Milestone Timeline

```
Week 1 (Days 1–5):   Foundation & Architecture (Auth, DB Schema, Swagger Stubs, React Scaffold)
Week 2 (Days 6–10):  Core CRUD & Realtime (All Module APIs & UIs, Socket.io, Audit Middleware)
Week 3 (Days 11–15): Workflows & Automation (SLA Workers, Round-Robin, Approvals, Resend Emails)
Week 4 (Days 16–20): QA, Security Pass, Load Testing, Production Go-Live
```

## Critical Cross-Track Dependencies (Blockers)

1. **Day 2 (Dev D → Devs A, B, C):** Dev D publishes OpenAPI/Swagger contract and Drizzle schemas so Devs A, B, C can build against stubs immediately.
2. **Day 3 (Dev D → Devs A, B, C):** Dev D delivers functional `/auth/login`, `/auth/refresh`, and `@Roles()` guards.
3. **Day 5 (All Devs):** Frontend Auth Context merged; protected route navigation verified against staging database (**Checkpoint 1**).
4. **Day 10 (Dev D → Devs A, B, C):** Socket.io gateway and BullMQ queue infrastructure live on staging (**Checkpoint 2**).
5. **Day 15 (All Devs):** Green RBAC e2e test suite (401/403 matrix) and background jobs functional (**Checkpoint 3**).
6. **Day 20 (All Devs):** Production Go-Live on Railway/Render (Backend+DB+Redis) and Vercel (Frontend).
