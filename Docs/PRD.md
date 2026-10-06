# Product Requirements Document (PRD)

### 1. Executive Summary

A 4-week production-grade IT Service Management (ITSM) platform designed to deliver operational efficiency and robust service operations for IT Directors and support teams. Built as a custom-backend production application, the platform implements core ITIL workflows (Incident, Problem, Service Request, Change, Asset Management) using a React (Vite) + Tailwind CSS + shadcn/ui frontend paired with a modular NestJS (TypeScript) REST API, PostgreSQL (Drizzle ORM), Socket.io real-time collaboration, BullMQ + Redis background automation, and Resend transactional notifications.

### 2. User Personas

* **Ian (IT Director / Admin):** Evaluates the platform for operational efficiency. Needs high-level ticket metrics, SLA compliance tracking, user role management, asset visibility, and system audit logs.
* **Alice (IT Support Agent):** The daily power user. Needs a fast, responsive interface to manage queues, auto-calculate priorities, update statuses, link Incidents to Problems, receive real-time ticket comment updates, and execute changes.
* **Eve (End User):** The employee needing IT assistance. Requires an intuitive portal to browse the Service Catalog, submit requests, and report incidents with clear status tracking.

### 3. User Stories

**Must-Have (Production Scope — 4 Weeks):**

* *Auth, Access & Audit:*
  * As a user, I can log in via email/password and obtain secure JWT tokens (short-lived access token + rotating httpOnly refresh token).
  * As the system, access to endpoints and UI views is strictly governed by RBAC guards (Admin, Agent, End User).
  * As an Admin, critical state changes, assignment events, and entity mutations are recorded in an `audit_log` table for traceability.

* *Incident & Problem Management:*
  * As an Agent, I can create, view, update, assign, and close incidents across defined lifecycle states (`New` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
  * As the system, Incident Priority (P1–P4) is automatically computed during creation/update from Impact × Urgency.
  * As an Agent/User, I can add comments to any ticket and see incoming comments stream in real-time via Socket.io.
  * As an Agent, I can link a Problem record (with root-cause analysis and known-error flags) to one or multiple Incidents.
  * As the system, incidents can be auto-assigned to available agents using a round-robin assignment service.

* *Service Request & Change Management:*
  * As an End User, I can select and submit predefined requests from a table-driven Service Catalog.
  * As an Admin, I can approve or reject submitted service requests and changes (single-level approval state machine).
  * As an Agent, I can create Change records (Standard, Normal, Emergency) specifying implementation schedules and rollback plans.

* *Assets & Automation:*
  * As an Admin, I can manage an asset register (CRUD hardware/software assets) and view linked tickets.
  * As an Admin, I can view an aggregate dashboard displaying ticket distributions by status, module, and SLA state.
  * As the system, background BullMQ jobs run on Redis schedules (every 5 minutes) to detect SLA breaches and automatically close tickets that have remained in `Resolved` for N days.
  * As the system, transactional email notifications are dispatched via Resend upon ticket assignment and status transitions.

* *Knowledge Base (Phase 5 / Week 5):*
  * As an Admin, I can author Knowledge Base categories and articles (Draft / Published).
  * As an End User or Agent, I can browse and search Published articles.
  * As an Agent, I can link Published articles to Incidents or Problems for self-service context.
  * As an Admin, I can edit table-driven SLA rule minutes per priority (not a drag-and-drop builder).
  * As an Admin, I can create/edit Service Catalog items beyond seed data.

**Nice-to-Have (Secondary Polish):**

* Dark mode toggle (supported natively via Tailwind + shadcn/ui).
* In-app toast notifications for real-time WebSocket events.

### 4. Out of Scope (Explicitly Excluded)

* Multi-tenant billing and subscription architecture.
* Enterprise SSO / Active Directory / SAML integrations.
* Advanced BI and custom drag-and-drop report builders.
* Native mobile applications (responsive web application only).
* Complex CMDB CI graph visualizations / dependency maps.
* Multi-level conditional approval chains.
* Dynamic drag-and-drop SLA policy rule builder UI (SLA rules are table-driven/seeded).

### 5. Success Metrics (Production Validation)

1. **Workflow Completion:** 100% of defined ITIL workflows (Incident, Problem, Service Request, Change, Asset) execute seamlessly from creation to resolution and closure.
2. **Security & Authorization Rigor:** NestJS RBAC guards enforce role isolation with a 100% green e2e test suite (401/403 matrix) across all protected routes.
3. **Automation & Queue Reliability:** BullMQ + Redis background workers reliably process SLA breach detection, auto-closure, and Resend email dispatches without job drops or unmonitored failures.
4. **Real-time Performance:** Socket.io gateway delivers comment and activity updates to ticket rooms with sub-second latency.
5. **Deployment & Observability:** Frontend running on Vercel; NestJS API, PostgreSQL, and Redis running on Railway/Render with active Pino logging and Sentry error monitoring.

