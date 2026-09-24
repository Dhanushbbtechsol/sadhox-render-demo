**Architecture & System Design**

Here is the system architecture tailored for our 7-day Supabase-driven build.

### 1. High-Level Architecture

* **Client Layer:** React single-page application (SPA) hosted on Vercel. Communicates strictly through the Supabase JS SDK.
* **API/Data Layer:** Supabase acts as the backend. Direct table queries are handled via PostgREST (Supabase's auto-generated API), authenticated via Supabase Auth JWTs.
* **Real-time Layer:** Supabase Realtime (WebSockets) listens to `INSERT` events on the `comments` table to update the ticket activity log instantly on the client.
* **Automation Layer (Async):**
* *Event-driven:* Postgres Database Webhooks listen for `INSERT`/`UPDATE` on ticket tables and trigger a Supabase Edge Function (Deno/TypeScript), which in turn calls the **Resend API** to dispatch emails.
* *Time-driven:* `pg_cron` runs inside the Postgres database every 5 minutes to identify SLA breaches and auto-close resolved tickets after *N* days.



### 2. Data Models (ERD / Supabase Schema)

Here are the core tables and relationships.

* **`users`**
* `id` (PK, UUID), `email`, `full_name`, `role` (Enum: Admin, Agent, EndUser)


* **`incidents`**
* `id` (PK, UUID), `title`, `description`, `status` (New, Assigned, InProgress, Resolved, Closed)
* `impact` (1-3), `urgency` (1-3), `priority` (1-4, auto-calculated)
* `reporter_id` (FK -> users), `assignee_id` (FK -> users, nullable)
* `problem_id` (FK -> problems, nullable)
* `created_at`, `sla_breach_at` (Timestamp)


* **`problems`**
* `id` (PK, UUID), `title`, `root_cause` (Text), `known_error` (Boolean), `status`


* **`service_requests`**
* `id` (PK, UUID), `catalog_item` (String), `status` (Submitted, Approved, Rejected, Fulfilled)
* `requester_id` (FK -> users), `approver_id` (FK -> users, nullable)


* **`changes`**
* `id` (PK, UUID), `title`, `type` (Standard, Normal, Emergency)
* `status`, `implementation_date` (Timestamp), `rollback_plan` (Text)


* **`assets`**
* `id` (PK, UUID), `name`, `asset_type` (Hardware, Software), `status`
* `owner_id` (FK -> users)


* **`comments` (Polymorphic)**
* `id` (PK, UUID), `body` (Text), `author_id` (FK -> users)
* `ticket_id` (UUID), `ticket_type` (Enum: Incident, Problem, Request, Change)
* *Note:* Polymorphic linking allows one comment table to serve all ITSM modules.



### 3. Core API Endpoints & Functions (Supabase Context)

Since Supabase auto-generates our REST API, our "custom endpoints" will be Postgres RPCs (Remote Procedure Calls) and Edge Functions:

1. **`RPC calculate_priority(impact, urgency)`**: A Postgres trigger function running on `BEFORE INSERT` or `BEFORE UPDATE` on the `incidents` table to automatically set the P1-P4 matrix value.
2. **`RPC assign_ticket_round_robin(ticket_id)`**: A Postgres function that fetches the Agent with the lowest open ticket count and assigns them to a newly created incident.
3. **`Edge Function: POST /functions/v1/email-notifier`**: Triggered via Database Webhook. Parses the webhook payload to determine if a ticket was assigned or changed status, templates the email, and sends it via the Resend API.
4. **`pg_cron: check_sla_and_auto_close`**: A scheduled job running `UPDATE incidents SET status = 'Breached' WHERE sla_breach_at < NOW() AND status NOT IN ('Resolved', 'Closed')`.

### 4. Security & Scalability Risks

* **Security Risk - RLS Leakage:** If Row Level Security policies are configured incorrectly, an End User could fetch the entire `incidents` table. *Mitigation:* We will write strict default-deny RLS policies and use a test suite/script on Day 1 to verify End Users can only SELECT rows where `reporter_id = auth.uid()`.
* **Scalability Risk - Polymorphic Foreign Keys:** The `comments` table uses `ticket_id` without a hard Postgres foreign key constraint (because it points to multiple tables). *Mitigation:* Not a huge issue for a demo, but we will ensure frontend validation and cascading deletes via triggers so orphaned comments don't accumulate.
* **Third-Party Risk - Email Sandbox Limits:** Resend's free tier has strict rate limits and requires domain verification or limits sending to verified sandbox emails. *Mitigation:* We will hardcode a specific set of test email addresses (e.g., the IT Director's team) in the Resend dashboard prior to the demo to ensure delivery.

---
