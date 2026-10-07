# Sadhox — Status & Feature Handoff (for Claude / agents)

**Last updated:** 2026-10-07  
**Integration branch:** `Audit` (Phase 5 merges); `Dev-C` has Audit merged + Dev C Phase 5 close-out  
**Memory bank:** `memory-bank/` (read all six files at task start)

This document is the short “what exists / what doesn’t” brief. Requirements and plans stay in PRD/FRD/Phase docs.

**Next phase (designed, not coded):** [Phase 6 — Projects / Manager](./Phase/phase6.md). Phase 5 Medium gaps closed on `Dev-C` (2026-10-07); merge close-out back to `Audit` before coding Phase 6. Do not rebuild Knowledge Base.

---

## 1. What the product is

Sadhox is an **ITSM** web app: End Users report issues and request services; Agents work queues; Admins approve, inventory assets, and oversee KPIs/audit/automation.

**Roles (today):** `Admin` | `Agent` | `EndUser`  
**Roles (Phase 6):** + `Manager` — see [Phase/phase6.md](./Phase/phase6.md)  
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

### Nest modules present
`auth`, `assignment`, `events`, `queues`, `mail`, `health`, `observability`, `incidents`, `problems`, `knowledge`, `service-catalog`, `service-requests`, `changes`, `comments`, `assets`, `admin`, `database`

### Key frontend routes (role-gated)
`/login`, role home, `/incidents`, `/problems`, `/catalog`, `/requests`, `/approvals`, `/changes`, `/portal`, `/portal/incidents/:id`, `/knowledge`, `/assets`, `/admin/dashboard`, `/admin/audit-logs`, `/admin/queues`, `/admin/catalog`, `/admin/knowledge`, `/admin/sla-rules`

---

## 5. What is NOT done / known gaps

**Phase 5 Medium/Low (2026-10-06 audit):** closed on `Dev-C` 2026-10-07 — SLA rules API, Admin Knowledge `{ data }` unwrap, offline-only mocks, catalog sanitize/option caps. See `Docs/Audit/phase5.md`.

Phase 4 Dev D carryovers still open (`Docs/Audit/phase4.md`): hardcoded LAN defaults in ops scripts (verify `require-env.mjs` path); CSRF gap with `SameSite=None` refresh cookie; minor throttle/Sentry hardening.

**Production go-live** checklist incomplete (`Docs/Phase/Dev D/go-live-checklist.md`) — do not assume live Render/Vercel is fully cut over.

**Out of scope (by design):** SSO, multi-tenant billing, drag-drop SLA builder, advanced BI, native apps, CMDB graphs, multi-level approval chains.

### Phase 6 (planned) — not implemented yet

Projects + modules + `Manager` role; resource-level `ProjectAccessService`; project-scoped assignment pool; Admin **and** Manager single-level approvals (null `project_id` = Admin-only); Managers are **not** ticket-working `project_members`. Full design: [Phase/phase6.md](./Phase/phase6.md).

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
