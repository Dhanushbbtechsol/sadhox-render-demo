# Sadhox — Status & Feature Handoff (for Claude / agents)

**Last updated:** 2026-10-07  
**Integration branch:** `Audit` (Phase 5 remediations + Phase 6 Dev A/B foundation + Dev C Admin projects UI / Manager home + Dev D backend; reaudit docs updated)  
**Memory bank:** `memory-bank/` (read all six files at task start)

This document is the short “what exists / what doesn’t” brief. Requirements and plans stay in PRD/FRD/Phase docs.

**Phase 6 (in progress):** [Projects / Manager](./Phase/phase6.md) — shared foundation (`Manager`, projects/modules, `ProjectAccessService`) landed; **Dev A** incident/problem project scoping + assignment pool; **Dev B** SR/Change project scoping + Manager-alongside-Admin approvals ([Dev B QA](./Phase/Dev%20B/phase6-day30-qa.md)); **Dev C** Admin `/admin/projects` CRUD + Manager home (KPIs and server-scoped charts) ([Dev C QA](./Phase/Dev%20C/phase6-qa.md)); **Dev D** backend Day 30 checkpoint (scoped assignment/approvals/lists, `PATCH /admin/users/:id/role`; contract: [contracts/phase6-openapi.md](./contracts/phase6-openapi.md) · handoff: [Phase/Dev D/phase6-handoff.md](./Phase/Dev%20D/phase6-handoff.md)). Do not rebuild Knowledge Base. Phase 5 close-out is on local `Audit`; `origin/Audit` push may still be pending. Staging/TL migrate deferred where host PG/SSH unreachable.

---

## 1. What the product is

Sadhox is an **ITSM** web app: End Users report issues and request services; Agents work queues; Admins approve, inventory assets, and oversee KPIs/audit/automation.

**Roles:** `Admin` | `Agent` | `EndUser` | `Manager` — Managers supervise owned projects and are not `project_members` — see [Phase/phase6.md](./Phase/phase6.md)  
**Personas:** Ian (Admin), Alice (Agent), Eve (EndUser) — see `Docs/PRD.md`  
**Note:** “Employee” in product talk maps to **Agent**, not a separate role.

---

## 2. Actual stack (ignore outdated Hono/Supabase scaffold labels)

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite, Tailwind, shadcn/ui, React Query, Zustand, React Router — `apps/web` |
| Backend | NestJS (TypeScript) — `apps/server` |
| DB | PostgreSQL + Drizzle — schema at `apps/server/src/database/schema/index.ts` |
| Auth | Passport JWT access + rotating httpOnly refresh cookie (not Supabase Auth) |
| Realtime | Socket.io (`ticket:{id}` rooms) |
| Jobs | BullMQ + Redis (SLA breach, auto-close, email) |
| Email | Resend |
| Hosting intent | Vercel (web) + Render (API/DB/Redis); CI via GitHub Actions |

Original Better Fullstack scaffold (`bts.jsonc`, generated `CLAUDE.md`/`AGENTS.md` Hono lines) is **historical**. Runtime code is NestJS.

Plain-language workflows: `Docs/Workflow.md`  
Architecture: `Docs/Architechture.md`  
Tech list: `Docs/Techstack.md`

---

## 3. Team tracks (what each owned)

| Dev | Scope |
|-----|--------|
| **D** | Auth, schema/migrations, Socket.io, BullMQ, mail, observability, CI/deploy, Knowledge API, catalog write APIs |
| **A** | Incidents, Problems, priority matrix, assignment/comments UI, portal incident detail, ticket↔KB links |
| **B** | Service Catalog/Requests, Changes, End User KB portal, Admin catalog CRUD UI |
| **C** | Assets, Admin dashboard/charts/audit/queues, email templates, Admin KB authoring, SLA table UI, CSV export |

Plans: `Docs/Phase/README.md` + per-dev `plan.md` / `phase1`–`phase5.md`  
Coverage of six product requirements: `Docs/Phase/coverage-matrix.md`  
Security audits: `Docs/Audit/phase1.md` … `phase5.md` (+ per-dev folders)

---

## 4. Features implemented (Phases 1–5)

### Platform
- JWT login / refresh / logout; global RBAC + rate limiting; audit log on mutations
- Swagger; health live/ready; Pino + Sentry hooks
- Realtime comments; SLA background jobs; Resend notifications
- Seed scripts (incl. production-oriented seed notes under Dev D phase docs)

### Incident & Problem (Dev A + D)
- Incident lifecycle: `New` → `Assigned` → `InProgress` → `Resolved` → `Closed`
- Priority P1–P4 from Impact × Urgency; `sla_due_at`; breach flagging
- Manual assign + round-robin / least-loaded assignment service
- Polymorphic comments + Socket.io UI
- Problems with root cause / known-error; multi-incident link
- **Phase 5:** related Knowledge articles on ticket detail; End User `/portal/incidents/:id`

### Service Catalog, Requests & Changes (Dev B + D)
- Catalog browse + dynamic form fields; request submit
- Approval state machine (Admin approve/reject → Agent fulfill)
- Changes: Standard / Normal / Emergency; Admin-gated schedule; rollback path
- **Phase 5:** End User `/knowledge` browse/search; Admin `/admin/catalog` CRUD UI; `POST`/`PATCH /service-catalog`

### Assets & Admin (Dev C + D)
- Asset register CRUD; link/unlink tickets; Admin-only `purchaseCost`
- Dashboard KPIs + Recharts (volume, status, SLA); audit log viewer; BullMQ queue monitor
- Dashboard **CSV export** (client-side from aggregates)
- **Phase 5:** Admin Knowledge authoring (`/admin/knowledge`); SLA rules **page** (`/admin/sla-rules`); CSV export; Knowledge/SLA hooks unwrap live API (no silent DEV mocks)

### Knowledge Base (Phase 5 — Dev D API + A/B/C UI)
- Tables: `knowledge_categories`, `knowledge_articles` (Draft/Published), `ticket_knowledge_links`
- Nest `KnowledgeModule` with RBAC (Draft hidden from non-Admin; Published-only links)
- Ticket ACL on link list/mutate (`assertCanAccessTicket`)
- Admin `GET`/`PATCH /admin/sla-rules` (response/resolve minutes per priority)
- **Phase 6:** `projects` / `project_members` / `modules`; `Manager` role; Admin `/admin/projects` (members + `/modules`); `GET /admin/users?role=` + `PATCH …/role` (pickers only); Manager `/manager` KPIs via `GET /manager/dashboard/stats` (owned `project_id`s only). **Admin User Management CRUD (`POST`/`GET`/`PATCH /admin/users` + `/admin/users` UI) still open** — see [Phase/phase6.md](./Phase/phase6.md)

### Nest modules present
`auth`, `assignment`, `events`, `queues`, `mail`, `health`, `observability`, `incidents`, `problems`, `knowledge`, `projects`, `service-catalog`, `service-requests`, `changes`, `comments`, `assets`, `admin`, `database`

### Key frontend routes (role-gated)
`/login`, role home, `/incidents`, `/problems`, `/catalog`, `/requests`, `/approvals`, `/changes`, `/portal`, `/portal/incidents/:id`, `/knowledge`, `/assets`, `/admin/dashboard`, `/admin/audit-logs`, `/admin/queues`, `/admin/catalog`, `/admin/knowledge`, `/admin/sla-rules`, `/admin/projects`, `/admin/projects/:id/members`, `/admin/projects/:id/modules`, `/manager`

---

## 5. What is NOT done / known gaps

**Phase 5 Medium/Low (2026-10-06 audit):** closed on `Dev-C` 2026-10-07 — SLA rules API, Admin Knowledge `{ data }` unwrap, offline-only mocks, catalog sanitize/option caps. Residual Low: other Admin surfaces still `catch → mock` in DEV. See `Docs/Audit/phase5.md`.

Phase 4 Dev D carryovers still open (`Docs/Audit/phase4.md` / Dev D phase5): CSRF gap with `SameSite=None` refresh cookie; throttle ceiling / logout throttle; Sentry WS auth noise. **LAN script High is closed.**

**Production go-live** checklist incomplete (`Docs/Phase/Dev D/go-live-checklist.md`) — do not assume live Render/Vercel is fully cut over.

**Out of scope (by design):** SSO, multi-tenant billing, drag-drop SLA builder, advanced BI, native apps, CMDB graphs, multi-level approval chains.

### Phase 6 — in progress

Design: [Phase/phase6.md](./Phase/phase6.md).

**Landed (foundation + Dev A + Dev B + Dev C + Dev D backend):** `Manager` role; `projects` / `project_members` / `modules`; `ProjectAccessService`; Dev A incident/problem project scoping + assignment pool; Dev B optional `projectId`/`moduleId` on service requests & changes, Manager-alongside-Admin approvals (null project = Admin-only), scoped SR/Change lists, catalog/change create pickers, Manager approvals UI; Dev C Admin projects UI + Manager home (KPIs / server-scoped charts); Dev D project-scoped assignment pool, list filters, `PATCH /admin/users/:id/role` clears memberships on promote-to-Manager. Contract/handoff: [phase6-openapi.md](./contracts/phase6-openapi.md) / [phase6-handoff.md](./Phase/Dev%20D/phase6-handoff.md). QA: [Phase/Dev B/phase6-day30-qa.md](./Phase/Dev%20B/phase6-day30-qa.md), [Phase/Dev C/phase6-qa.md](./Phase/Dev%20C/phase6-qa.md).

**Phase 6 security audit:** CLEAN for Dev A–D ([Docs/Audit/phase6.md](./Audit/phase6.md)) — assignment agents IDOR, EndUser project/module redaction, and ACL matrix coverage closed on Dev D.

**Still open:** **Admin User Management** (create/get/patch users API + `/admin/users` UI); remaining assignment-pool / incident UI wiring per phase6 plan; full ticket 401/403 matrix; local `0010_phase6_projects_manager` migrate + reseed where not yet applied. **Deferred to production go-live:** staging/TL migrate (`0010`); Phase 5 mail job-ID live verify on TL remains **unconfirmed**.

---

## 6. How Claude should work in this repo

1. Read `memory-bank/*.md` + this file before coding.
2. Prefer **ponytail** minimal fixes for audit items; change fewest files.
3. AuthZ = Nest `@Roles` / service ACL — never “fix it only in the UI.”
4. Schema changes = Drizzle migrations under the server package.
5. Merge workflow: `Dev-*` → `Audit`; commit/push only when the user asks.
6. Do not trust root `README.md` / generated Hono-Supabase blurbs without checking `apps/server` and `apps/web`.

---

## 7. Doc map

| Doc | Purpose |
|-----|---------|
| `Docs/STATUS.md` | **This handoff** |
| `Docs/PRD.md` / `FRD.md` | Requirements |
| `Docs/Workflow.md` | End-to-end user workflows |
| `Docs/Phase/` | Day plans + coverage matrix + [phase6.md](./Phase/phase6.md) |
| `Docs/Audit/` | Security/phase reaudits + per-dev fix lists |
| `Docs/Execution plan.md` | Original 4-week plan (Nest-oriented; some early wording may lag Phase 5) |
| `memory-bank/` | Persistent agent context |
