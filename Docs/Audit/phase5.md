# Phase 5 reaudit — 2026-10-06

Scope: current `Audit` tree after Dev-A/B/C/D Phase 5 merges. Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings: 0 Critical · 0 High (new) · 3 Medium · 0 Low (Phase 5 catalog sanitize/options closed)** (+ Phase 4 Dev D carryovers still open).

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
| Dashboard CSV export | client-side from existing admin aggregates |

## Medium

### [A04] Missing Admin SLA rules API — Dev D

Phase 5 contract requires `GET`/`PATCH` Admin SLA rules. UI calls `/admin/sla-rules` but **no Nest controller/route exists**. Production Admin cannot change `responseMinutes` / `resolveMinutes`; breach jobs keep seed values.

Fix: add Admin-only `GET /admin/sla-rules` + `PATCH` (by priority) with validation + RBAC matrix rows.

### [A04 / A08] Admin Knowledge list hooks ignore `{ data }` envelope — Dev C

`KnowledgeService.listCategories` / `listArticles` return `{ data: [...] }`. Portal hooks unwrap correctly (`use-knowledge.ts`). Admin hooks in `features/admin/hooks.ts` call `apiFetch<KnowledgeCategory[]>` / `KnowledgeArticle[]` and treat the response as an array → runtime failure → **DEV catch falls back to mocks**.

Fix: unwrap `result.data` (same as `use-knowledge.ts`); remove silent mock fallback on live API errors (or gate offline mocks only via `useOfflineAdminData()`).

### [A04 / A07] DEV mock fallback on live Knowledge / SLA API errors — Dev C

On `catch`, `import.meta.env.DEV` returns/updates in-memory `mockKnowledge*` / `mockSlaRules`, including **write mutations**. Admin can “publish” or “edit SLA” with toast success while nothing persists (and SLA API is missing). Gated to DEV builds (not prod bundle) — still a false-control risk for local/staging walkthroughs.

Fix: fail loudly on API errors in authoring/SLA hooks; keep mocks only for explicit offline-token mode.

## Low / Hardening — Resolved (Phase 5 catalog)

### [A03] Catalog writes trim only — Dev D / Dev B — **FIXED**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name/description/department and form field label/name/options. Spec: `service-catalog.service.spec.ts`.

### [A04] Catalog `formFields.options` unbounded — Dev D — **FIXED**

`CatalogFormFieldDto.options`: `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Still open from Phase 4 — Dev D (carryover)

| Sev | Item |
| --- | --- |
| High | Hardcoded LAN DB/Redis defaults in probe/clean/rebaseline scripts |
| Medium | `SameSite=None` refresh cookie without CSRF defense |
| Low | `THROTTLE_GLOBAL_LIMIT` prod ceiling; throttle `/auth/logout`; skip expected WS auth denials in Sentry |

## Still sound (spot-checked)

Knowledge Draft visibility; link Published-only; EndUser cannot mutate links; portal `readOnly` + server ACL; catalog `POST`/`PATCH` Admin; `includeInactive` Admin-only; markdown preview is React text nodes (no HTML injection sink); Drizzle `ilike` parameterized; RBAC matrix covers Knowledge + catalog writes.

A06 CVE scan / A10 SSRF: nothing new in Phase 5 deltas.

## Review checklist (human)

1. Admin publishes article → appears in End User `/knowledge` search (live API, not mocks).
2. EndUser `POST` knowledge article / catalog item → 403.
3. EndUser cannot list KB links on another user’s incident.
4. Admin SLA editor: after Dev D API lands, PATCH persists and affects breach timing.
5. Catalog create with hostile `description` / option strings stays plain text in request form UI.

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Live Render/Vercel runtime
- Full Playwright E2E of Phase 5 walkthrough
- No `.review.yml` in repo (sonar defaults used)
