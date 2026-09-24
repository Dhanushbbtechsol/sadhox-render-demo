# Execution Plan.

### 1. Module Ownership Table

*To minimize cross-dependencies, each developer owns the full vertical slice (Frontend + API interactions) of their assigned modules once the Day 1 scaffold is complete.*

| Developer | Core Ownership | Key Responsibilities |
| --- | --- | --- |
| **Dev 1 (Lead)** | **Incidents, Problems & DB Core** | Supabase project setup, Schema/RLS definitions, Incident/Problem CRUD UI, Real-time comments log, Priority auto-calc (RPC), **Round-robin assignment (RPC)**. |
| **Dev 2** | **Service Requests, Changes & UI Core** | React/Vite scaffolding, shadcn/ui + Tailwind setup, Service Catalog UI, Approval workflows, Change Management CRUD UI. |
| **Dev 3** | **Assets, Admin & Automation** | Asset register UI, Supabase Edge Functions (Resend emails), `pg_cron` SLA jobs, Admin Dashboard charts, Demo Seed Script. |

---

### 2. Day-by-Day Timeline (7-Day Sprint)

| Day | Dev 1 (Incidents/Problems/DB) | Dev 2 (Requests/Changes/UI) | Dev 3 (Assets/Admin/Auto) | Integration Checkpoints |
| --- | --- | --- | --- | --- |
| **Day 1** | Init Supabase. Write & run SQL schema. Define RLS policies. | Init Vite+React. Install Tailwind & shadcn/ui. Set up Router & Auth. | Draft DB seed script (JSON data). Build UI layout shell (Sidebar). | **Checkpoint:** DB is live. UI shell is merged to `main`. |
| **Day 2** | Build Incident list & creation forms. Write RPC for Priority calc. | Build Service Catalog UI and Request submission form. | Build Asset Register (CRUD views) and link to Supabase. | **Checkpoint:** Devs can read/write to their respective tables. |
| **Day 3** | Build Incident detail view. Implement Problem linking UI. | Build Service Request approval UI. Build Change Mgmt forms. | Build Admin Dashboard layout. Scaffold Recharts/shadcn charts. | **Checkpoint:** Core CRUD is functionally complete across all modules. |
| **Day 4** | Build Real-time Comments UI. **Write RPC for round-robin assignment.** | Refine Service/Change approval state management and UI validation. | Write Edge Function for Resend emails. Test DB Webhook triggers. | **Checkpoint:** Asynchronous workflows (emails, real-time) are active. |
| **Day 5** | RLS UI enforcement (hide Admin actions from End Users). | Polish forms (toast notifications, loading states, validation). | Setup `pg_cron` for SLA breaches & auto-close. Hook charts to DB. | **Feature Freeze:** No net-new features. Pivot to polish and QA. |
| **Day 6** | End-to-end QA (Incident/Problem). Fix bugs. | End-to-end QA (Service/Change). Fix bugs. | Execute master Seed Script to populate 50+ realistic demo records. | **Checkpoint:** System is populated with rich demo data. |
| **Day 7** | Deploy to Vercel. Verify Production Env Vars. | Perform Demo Walkthrough. Record backup screen-capture. | Configure Resend sandbox emails for the client. Finalize credentials. | **GO LIVE:** Shareable Trial URL is generated and tested. |

---

### 3. Dependency Flags (Blockers)

* 🚩 **Blocker 1 (Day 1, 2:00 PM):** Dev 1 **must** finish and deploy the Supabase schema and RLS policies by midday. Devs 2 and 3 cannot fetch or insert data until the tables exist.
* 🚩 **Blocker 2 (Day 1, 5:00 PM):** Dev 2 **must** merge the Vite/React scaffold with the routing and Auth Provider by end-of-day. Devs 1 and 3 need this shell to build their specific pages on Day 2.
* 🚩 **Blocker 3 (Day 4):** Dev 3's Edge Function for email notifications depends on Dev 1 and Dev 2 standardizing the status values (`status` column) across Incidents, Service Requests, **and Changes**.

---

### 4. Definition of Done (Milestones)

* **Day 1 - Scaffolded:** Supabase backend is live with tables and auth. Frontend repository is pushed to GitHub with Vite, Tailwind, shadcn/ui, and routing established.
* **Day 3 - Functional (Core):** Users can log in, create tickets/assets, view them in data tables, and update statuses. No polished validation or emails yet, but the data flows from client to DB perfectly.
* **Day 5 - Automated & Secure:** Supabase Edge functions send emails successfully. RLS strictly prevents an End User from seeing the Admin dashboard. Real-time comments appear without refreshing.
* **Day 7 - Demo-Ready (Shipped):** The app is deployed on Vercel. The database is seeded with realistic IT data. The client can log in with provided credentials and experience zero unhandled errors during a standard ITIL workflow.

---