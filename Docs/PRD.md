**Product Requirements Document (PRD)**

### 1. Executive Summary

A 7-day, fast-tracked functional ITSM demonstration platform designed to showcase operational efficiency and ease of use to IT Directors. Built as a deployable, single-tenant free trial, the application focuses on core ITIL workflows (Incident, Problem, Service Request, Change, Asset) utilizing a React + shadcn/ui frontend and a robust Supabase backend. The UI will balance a polished Admin Dashboard for decision-makers with a highly efficient ticketing interface for IT Agents.

### 2. User Personas

* **Ian (IT Director / Admin):** Evaluates the platform for operational efficiency. Needs to see high-level ticket metrics, ensure SLA compliance, manage user access, and configure assets.
* **Alice (IT Support Agent):** The daily power user. Needs a fast, frictionless interface to manage queues, update statuses, link records (Incidents to Problems), and communicate in real-time.
* **Eve (End User):** The employee needing help. Requires a dead-simple portal to submit standard service requests and report incidents.

### 3. User Stories

**Must-Have (MVP Scope for 7-Day Build):**

* *Global:* As a user, I can log in via email/password and only see data/actions permitted by my role (Admin, Agent, End User).
* *Incident & Problem:*
* As an Agent, I can create, view, update, and close incidents.
* As the system, I will auto-calculate Incident Priority (P1–P4) based on Impact × Urgency.
* As an Agent/User, I can add comments to a ticket and see them update in real-time.
* As an Agent, I can link a Problem record (with root-cause and known-error flags) to multiple Incidents.


* *Service Request & Change:*
* As an End User, I can select a predefined service request from a table-driven Service Catalog.
* As an Admin, I can approve or reject submitted service requests and changes (single-level approval).
* As an Agent, I can create a Change record (Standard/Normal/Emergency) with a scheduled implementation date and a text-based rollback plan.


* *Assets & Automation:*
* As an Admin, I can manage an asset register (CRUD hardware/software) and view linked tickets.
* As an Admin, I can view a dashboard with basic charts (ticket counts by status/module).
* As the system, I will flag SLA breaches automatically via cron jobs.
* As the system, I will send email notifications via Resend upon ticket assignment or status change.



**Nice-to-Have (If time permits within 7 days):**

* Dark mode toggle (easily supported by shadcn/ui).
* In-app toast notifications for real-time updates.

### 4. Out of Scope (Explicitly Excluded)

* Multi-tenant billing architecture.
* SSO / Active Directory integration.
* Advanced reporting / BI tools.
* Native mobile applications.
* Complex CMDB dependency mapping (node graphs).
* Multi-level or conditional approval workflows.
* Dynamic SLA policy builder UI (SLA rules will be hardcoded or simple DB rows for the demo).

### 5. Success Metrics (Demo Validation)

1. **Workflow Completion:** 100% of defined CRUD workflows (Incident, Problem, Service, Change, Asset) can be executed from creation to closure without errors.
2. **Security Enforcement:** Supabase Row Level Security (RLS) successfully blocks End Users from accessing Admin/Agent-only endpoints and views.
3. **Automation Reliability:** Edge Functions successfully trigger Resend emails and flag SLA breaches on a consistent schedule.
4. **Deployment:** Frontend live on Vercel/Netlify and Backend live on Supabase by Day 7.

---
