# Functional Requirements Document — ITSM Demo (Free Trial Build)

**Timeline:** 7 days | **Team:** 3 developers | **Backend:** Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
**Frontend:** React + Tailwind (recommended for speed)
**Goal:** Working demo covering core ITSM modules, deployable for client trial access.

---

## 1. Scope (Demo-Level, Not Full Product)
Out: multi-tenant billing, SSO, advanced reporting/BI, mobile apps, CMDB dependency mapping.
In: core CRUD workflows, role-based access, basic automation, single-tenant demo data.

## 2. Modules & Developer Split

### Dev 1 — Incident + Problem Management
- Incident: create/view/update/close, priority (P1–P4) auto-calc from Impact×Urgency, SLA timer field, assignment (manual + round-robin auto-assign), status workflow (New→Assigned→In Progress→Resolved→Closed).
- Comments/activity log per ticket (Supabase Realtime).
- Problem: link problems to incidents, root-cause field, known-error flag.

### Dev 2 — Service Request + Change Management
- Service Catalog: predefined request types (table-driven), approval step (single-level).
- Service Request workflow: Submitted→Approved/Rejected→Fulfilled.
- Change Management: Change record (Standard/Normal/Emergency type), approval workflow, scheduled implementation date/time, rollback plan text field.

### Dev 3 — Asset Management + Auth/Admin + Automation
- Asset register: CRUD (hardware/software type, owner, status, linked tickets).
- Auth: Supabase Auth (email/password), roles — Admin, Agent, End User (RLS policies per role).
- Automation (Edge Functions): SLA breach flagging (cron), email/notification on ticket assignment & status change, auto-close after N days in Resolved.
- Admin dashboard: ticket counts by status/module (basic charts).

## 3. Data Model (Supabase Tables)
`users`, `incidents`, `service_requests`, `changes`, `problems`, `assets`, `comments`, `sla_rules`, `notifications`. Foreign keys link comments/assets to any ticket type via `ticket_type` + `ticket_id`.

## 4. Non-Functional
- RLS enforced per role on all tables.
- Seed script with demo data for client walkthrough.
- Deployed on Vercel/Netlify (frontend) + Supabase project (backend); shareable trial URL with demo login credentials.

## 5. Day-by-Day Plan
| Day | Milestone |
|---|---|
| 1 | Supabase schema, auth, RLS setup |
| 2–3 | Core CRUD per module (parallel) |
| 4 | Workflow states + approvals |
| 5 | Automation (SLA, notifications) + Asset module |
| 6 | Admin dashboard, seed data, integration |
| 7 | QA pass, deploy, demo login setup |

## 6. Out-of-Scope Follow-ups (mention to client post-demo)
Advanced reporting, CMDB relationships, multi-level approvals, SSO/AD integration, SLA policy builder UI.