# Phase 5 reaudit — 2026-10-06

Scope: current `Audit` / `Dev-C` tree after Dev-A/B/C/D Phase 5 merges. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings (2026-10-07 close-out on Dev-C): 0 Critical · 0 High (new) · 0 Medium · 0 Low (Phase 5)** — Phase 4 Dev D carryovers still open.

**Owners:** [Dev A](./Dev%20A/phase5.md) · [Dev B](./Dev%20B/phase5.md) · [Dev C](./Dev%20C/phase5.md) · [Dev D](./Dev%20D/phase5.md)

## What landed (spot-checked)

| Surface | Evidence |
| --- | --- |
| Knowledge schema + migration | `0009_phase5_knowledge_base` + `knowledge_*` / `ticket_knowledge_links` |
| KnowledgeModule RBAC | `@Roles` on reads/writes/links; Draft hidden from non-Admin |
| Ticket–article links + IDOR | `assertCanAccessTicket` on list/link/unlink |
| Portal incident detail | `/portal/incidents/:id` + `RelatedArticles readOnly` |
| End User / Agent KB browse | `/knowledge`, `/knowledge/:slug` |
| Admin catalog CRUD UI + API | `POST`/`PATCH /service-catalog` `@Roles("Admin")` |
| Admin KB authoring UI | `/admin/knowledge` |
| Admin SLA rules API | `GET`/`PATCH /admin/sla-rules` (+ path param) |
| Dashboard CSV export | client-side from existing admin aggregates |

## Medium — Resolved

### [A04] Missing Admin SLA rules API — Dev D — **FIXED**

Admin-only `GET /admin/sla-rules`, `PATCH /admin/sla-rules/:priority`, body fallback `PATCH /admin/sla-rules`. DTOs + `rbac-matrix.spec.ts` + `admin.sla-rules.spec.ts`.

### [A04 / A08] Admin Knowledge list hooks ignore `{ data }` envelope — Dev C — **FIXED**

Admin hooks unwrap `result.data`; portal pattern matched (`f9c6156`).

### [A04 / A07] DEV mock fallback on live Knowledge / SLA API errors — Dev C — **FIXED**

Mocks only via `useOfflineAdminData()`; live authoring/SLA fail loudly.

## Low / Hardening — Resolved

### [A03] Catalog writes trim only — Dev D / Dev B — **FIXED**

`ServiceCatalogService` uses `sanitizePlainText` on name/description/department + form field strings.

### [A04] Catalog `formFields.options` unbounded — Dev D — **FIXED**

`CatalogFormFieldDto.options`: `@MaxLength` per string + `@ArrayMaxSize`.

## Still open from Phase 4 — Dev D (carryover)

| Sev | Item |
| --- | --- |
| High | Hardcoded LAN DB/Redis defaults in probe/clean/rebaseline scripts |
| Medium | `SameSite=None` refresh cookie without CSRF defense |
| Low | `THROTTLE_GLOBAL_LIMIT` prod ceiling; throttle `/auth/logout`; skip expected WS auth denials in Sentry |

## Still sound (spot-checked)

Knowledge Draft visibility; link Published-only; EndUser cannot mutate links; portal `readOnly` + server ACL; catalog `POST`/`PATCH` Admin; `includeInactive` Admin-only; markdown preview is React text nodes (no HTML injection sink); Drizzle `ilike` parameterized; RBAC matrix covers Knowledge + catalog writes + SLA rules.

A06 CVE scan / A10 SSRF: nothing new in Phase 5 deltas.

## Review checklist (human)

1. Admin publishes article → appears in End User `/knowledge` search (live API, not mocks).
2. EndUser `POST` knowledge article / catalog item → 403.
3. EndUser cannot list KB links on another user’s incident.
4. Admin SLA editor: PATCH persists and affects breach timing.
5. Catalog create with hostile `description` / option strings stays plain text in request form UI.

## Not checked / out of scope

- Staging TLS and secret stores
- Full lockfile CVE audit
- Phase 6 Projects / Manager
