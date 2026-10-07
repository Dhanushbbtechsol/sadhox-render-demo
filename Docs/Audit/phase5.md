# Phase 5 reaudit — 2026-10-07

Scope: current `Audit` tree after Dev-A/B/C/D Phase 5 merges + Dev D remediations (`46cbc27` / `af8fd61`). Stack: React/Vite + Zustand, NestJS, Drizzle/Postgres, Passport JWT + refresh cookie, Socket.IO, BullMQ/Redis, Resend.

**Open findings: 0 Critical · 0 High · 2 Medium · 0 Low (Phase 5)**  
**Phase 4 carryovers still open (Dev D): 1 Medium · 3 Low** (LAN High closed).

**Owners:** [Dev A](./Dev%20A/phase5.md) · [Dev B](./Dev%20B/phase5.md) · [Dev C](./Dev%20C/phase5.md) · [Dev D](./Dev%20D/phase5.md)

## Verified remediations (since 2026-10-06)

| Item | Evidence |
| --- | --- |
| Admin SLA rules API | `GET`/`PATCH /admin/sla-rules` (+ `/:priority`); `AdminService.listSlaRules` / `updateSlaRule`; RBAC matrix + `admin.sla-rules.spec.ts` |
| Catalog sanitize | `ServiceCatalogService` → `sanitizePlainText` on name/description/department/form fields |
| Catalog options bounds | `CatalogFormFieldDto` `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })` |
| Hardcoded LAN script defaults | `requireEnv` in probe/clean/rebaseline; no `192.168.*` fallbacks |

## Medium — still open (Dev C)

### [A04 / A08] Admin Knowledge list hooks ignore `{ data }` envelope

`KnowledgeService.listCategories` / `listArticles` still return `{ data: [...] }`. Portal `use-knowledge.ts` unwraps. Admin `features/admin/hooks.ts` still does `apiFetch<KnowledgeCategory[]>` / `KnowledgeArticle[]` and calls `.filter` on the payload.

**Fix:** unwrap `(await apiFetch<{ data: T[] }>(...)).data` (same as `use-knowledge.ts`).

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors

Same file: `catch { if (import.meta.env.DEV) return/update mocks }` on category/article/SLA reads and writes. SLA API now exists, but failed live calls can still look successful in DEV (including write mutations — false-control risk for local/staging walkthroughs).

**Fix:** unwrap `result.data` where needed; mocks only when `useOfflineAdminData()` — otherwise rethrow / fail loudly on API errors.

## Low / Hardening — Resolved (Phase 5 catalog)

### [A03] Catalog writes trim only — Dev D / Dev B — **FIXED**

`ServiceCatalogService.create` / `update` use `sanitizePlainText` on name/description/department and form field label/name/options. Spec: `service-catalog.service.spec.ts`.

### [A04] Catalog `formFields.options` unbounded — Dev D — **FIXED**

`CatalogFormFieldDto.options`: `@ArrayMaxSize(50)` + `@MaxLength(128, { each: true })`.

## Still open from Phase 4 — Dev D (carryover)

| Sev | Item | Status |
| --- | --- | --- |
| High | Hardcoded LAN DB/Redis defaults in scripts | **FIXED (verified)** |
| Medium | `SameSite=None` refresh cookie without CSRF | **Still open** |
| Low | Cap `THROTTLE_GLOBAL_LIMIT` in production | **Still open** |
| Low | Throttle `/auth/logout` like refresh | **Still open** |
| Low | Skip expected WS auth denials in Sentry | **Still open** (`sentry-exception.filter.ts` still `captureException` for all WS) |

## Still sound (spot-checked)

Knowledge Draft visibility; link Published-only; EndUser ticket ACL on links; portal `readOnly`; catalog `POST`/`PATCH` Admin; SLA Admin-only; markdown preview React text nodes; Drizzle parameterized search; RBAC matrix covers Knowledge + catalog + SLA.

A06 CVE scan / A10 SSRF: nothing new.

## Review checklist (human)

1. Admin publishes article → End User `/knowledge` sees it (live API, not mocks).
2. Admin Knowledge list loads against Nest `{ data }` envelope after Dev C fix.
3. Admin SLA PATCH persists and is used by breach jobs.
4. Probe scripts fail without `DATABASE_URL` / `REDIS_URL`.

## Not checked / out of scope

- Staging TLS and secret stores
- `pnpm-lock.yaml` CVE scan
- Live Render/Vercel cutover
- Full Playwright Phase 5 walkthrough
