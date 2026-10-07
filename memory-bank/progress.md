# Progress

**Branch head (as of 2026-10-07):** `Audit` — Phase 5 merges + Phase 5 audit logged (`21677bc phase 5 Audit`).

Full feature inventory for Claude: **`Docs/STATUS.md`**.

## Phases completed (merged)

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Nest scaffold, Drizzle schema, JWT/RBAC, React shell, CI | Done |
| 2 | Module CRUD, Socket.io, BullMQ wiring, audit middleware | Done |
| 3 | Round-robin, SLA jobs, Resend, approval machines, Admin charts | Done |
| 4 | Security remediations, load notes, deploy prep, seed hardening | Done (go-live checklist not fully executed) |
| 5 | Knowledge Base + portal detail + catalog Admin CRUD + CSV + SLA UI | Code merged; see open gaps |
| 6 | Projects / Modules / Manager + project ACL & assignment | Designed only — [Docs/Phase/phase6.md](../Docs/Phase/phase6.md); gate: Phase 5 Medium gaps |

## Feature checklist (implemented in codebase)

### Platform
- [x] NestJS API with global JWT + Roles + throttle guards
- [x] Passport login / refresh (httpOnly cookie) / logout
- [x] Drizzle schema: users, refresh_tokens, audit_log, incidents, problems, service_catalog/requests, changes, assets, comments, sla_rules, notifications, knowledge_*, ticket_knowledge_links
- [x] Socket.io ticket rooms + comments
- [x] BullMQ SLA breach + auto-close + mail queue
- [x] Resend integration + email templates
- [x] Audit log interceptor + Admin audit UI
- [x] Health endpoints; Swagger; Sentry/Pino wiring
- [x] Frontend auth wired to real API (Zustand + api client); role-gated routes

### ITIL modules
- [x] Incidents: lifecycle, Impact×Urgency → P1–P4, assign / round-robin, SLA countdown UI, comments
- [x] Problems: CRUD, known-error, multi-incident linking
- [x] Service Catalog + Requests: submit → approve/reject → fulfill
- [x] Changes: types, approval-gated schedule, rollback
- [x] Assets: Admin CRUD, ticket link/unlink, purchaseCost Admin-only
- [x] Admin dashboard: KPIs, charts, queue monitor, CSV export
- [x] Knowledge Base: schema/API, Admin authoring, End User browse/search, ticket↔article links
- [x] Portal incident detail for End Users
- [x] Admin catalog CRUD UI + `POST`/`PATCH /service-catalog`

## Planned (Phase 6) — not started
- [ ] Close Phase 5 Medium gaps first (SLA API, Admin Knowledge hooks/mocks)
- [ ] `projects` / `project_members` / `modules`; nullable `project_id`/`module_id` on tickets
- [ ] Role `Manager` + JWT/`@Roles` + 401/403 matrix
- [ ] `ProjectAccessService`; scoped lists; Admin+Manager approvals; project-scoped assignment pool
- [ ] Admin projects UI; Manager-scoped views — see phase6 track plans

## Open / incomplete

### Phase 5 audit (2026-10-06) — see `Docs/Audit/phase5.md`
- [ ] **Medium:** Admin `GET`/`PATCH /admin/sla-rules` Nest routes missing (UI exists)
- [ ] **Medium:** Admin Knowledge list hooks ignore `{ data }` envelope → DEV mock fallback
- [ ] **Medium:** DEV mock fallback on live Knowledge/SLA write errors
- [ ] **Low:** Catalog write sanitize/options bounds

### Phase 4 carryovers (Dev D) — see `Docs/Audit/phase4.md`
- [ ] **High:** Probe/clean scripts hardcoded LAN DB/Redis defaults
- [ ] **Medium:** `SameSite=None` refresh cookie without CSRF defense
- [ ] **Low:** Throttle prod ceiling; throttle logout; skip expected WS auth denials in Sentry

### Production go-live
- [ ] Render services + migrations applied; real Vercel CORS pair
- [ ] Production seed + credential handover
- [ ] Full go-live checklist (`Docs/Phase/Dev D/go-live-checklist.md`)

## Intentionally not built
Drag-drop SLA builder, advanced BI, SSO, multi-tenant billing, native mobile, CMDB graphs.
