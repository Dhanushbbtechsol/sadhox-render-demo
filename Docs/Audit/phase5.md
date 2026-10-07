# Phase 5 reaudit — 2026-10-07 (pass 2)

Scope: `Dev-C` after merging `Dev-D`. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings (Phase 5): 0 Critical · 0 High · 0 Medium · 1 Low**  
**Phase 4 carryovers still open (Dev D): 1 Medium · 3 Low** (LAN High closed).

**Owners:** [Dev A](./Dev%20A/phase5.md) · [Dev B](./Dev%20B/phase5.md) · [Dev C](./Dev%20C/phase5.md) · [Dev D](./Dev%20D/phase5.md)

## Verified remediations

| Item | Evidence |
| --- | --- |
| Knowledge schema + migration | `0009_phase5_knowledge_base` + `knowledge_*` / `ticket_knowledge_links` |
| KnowledgeModule RBAC | `@Roles` on reads/writes/links; Draft hidden from non-Admin |
| Ticket–article links + IDOR | `assertCanAccessTicket` on list/link/unlink |
| Portal incident detail | `/portal/incidents/:id` + `RelatedArticles readOnly` |
| End User / Agent KB browse | `/knowledge`, `/knowledge/:slug` |
| Admin catalog CRUD UI + API | `POST`/`PATCH /service-catalog` `@Roles("Admin")` |
| Admin KB authoring UI | `/admin/knowledge` |
| Admin SLA rules API | `GET`/`PATCH /admin/sla-rules` (+ `/:priority`); RBAC + `admin.sla-rules.spec.ts` |
| Dashboard CSV export | client-side from existing admin aggregates |
| Catalog sanitize + options bounds | `ServiceCatalogService` + `CatalogFormFieldDto` `@ArrayMaxSize(50)` / `@MaxLength(128, { each: true })` |
| Hardcoded LAN script defaults | `requireEnv` in probe/clean/rebaseline |
| Admin Knowledge `{ data }` unwrap | `unwrapKnowledgeList` in `features/admin/hooks.ts` (categories + articles) |
| Knowledge/SLA silent DEV mock on API error | Knowledge/SLA live paths no longer `catch → mocks`; mocks only via `useOfflineAdminData()` |

## Medium — Resolved

### [A04] Missing Admin SLA rules API — Dev D — **FIXED**

Admin-only `GET /admin/sla-rules`, `PATCH /admin/sla-rules/:priority`, body fallback `PATCH /admin/sla-rules`. DTOs + `rbac-matrix.spec.ts` + `admin.sla-rules.spec.ts`.

### [A04 / A08] Admin Knowledge list hooks ignore `{ data }` envelope — Dev C — **FIXED**

Admin hooks unwrap `result.data`; portal pattern matched (`f9c6156`).

### [A04 / A07] DEV mock fallback on live Knowledge / SLA API errors — Dev C — **FIXED**

Mocks only via `useOfflineAdminData()`; live authoring/SLA fail loudly.

## Low / Hardening — Resolved

### [A03] Catalog writes trim only — Dev D / Dev B — **FIXED**

`ServiceCatalogService` uses `sanitizePlainText` on name/description/department + form field strings. Empty post-sanitize → `400`.

### [A04] Catalog `formFields.options` unbounded — Dev D — **FIXED**

`CatalogFormFieldDto.options`: `@MaxLength(128, { each: true })` + `@ArrayMaxSize(50)`.

## Low / Hardening — still open (Dev C)

### [A04 / A07] Residual DEV `catch → mock` on other Admin surfaces

`features/admin/hooks.ts` still returns mocks on live API failure for assets list, dashboard stats/charts, audit logs, and queues when `import.meta.env.DEV` (outside `useOfflineAdminData()`).

**Fix:** same rule as Knowledge — rethrow unless offline mock token.

## Still open from Phase 4 — Dev D (carryover)

| Sev | Item | Status |
| --- | --- | --- |
| High | Hardcoded LAN DB/Redis defaults in scripts | **FIXED** |
| Medium | `SameSite=None` refresh cookie without CSRF | **Still open** |
| Low | Cap `THROTTLE_GLOBAL_LIMIT` in production | **Still open** |
| Low | Throttle `/auth/logout` like refresh | **Still open** |
| Low | Skip expected WS auth denials in Sentry | **Still open** |

## Still sound (spot-checked)

Knowledge Draft visibility; link Published-only; EndUser cannot mutate links; EndUser ticket ACL on links; portal `readOnly` + server ACL; catalog `POST`/`PATCH` Admin; `includeInactive` Admin-only; SLA Admin-only; markdown preview is React text nodes (no HTML injection sink); Drizzle `ilike` parameterized; RBAC matrix covers Knowledge + catalog writes + SLA rules.

A06 CVE scan / A10 SSRF: nothing new.

## Review checklist (human)

1. Admin publishes article → appears in End User `/knowledge` search (live API, not mocks).
2. Admin Knowledge list loads against Nest `{ data }` envelope.
3. Kill Nest / force API error → Admin Knowledge/SLA fail loudly (no silent mock success).
4. EndUser `POST` knowledge article / catalog item → 403.
5. EndUser cannot list KB links on another user’s incident.
6. Admin SLA editor: PATCH persists and affects breach timing.
7. Catalog create with hostile `description` / option strings stays plain text in request form UI.
8. Probe scripts fail without `DATABASE_URL` / `REDIS_URL`.

## Not checked / out of scope

- Staging TLS and secret stores
- Full lockfile CVE audit / `pnpm-lock.yaml` CVE scan
- Phase 6 Projects / Manager
- Live Render/Vercel cutover
- Full Playwright Phase 5 walkthrough
