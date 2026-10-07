# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-07. Combined: [phase5.md](../phase5.md). **CLEAN.**

## Medium — Resolved

### [A04 / A08] Knowledge list hooks ignore API `{ data }` envelope — **FIXED (verified)**

`useKnowledgeCategories` / `useKnowledgeArticles` unwrap `(await apiFetch<{ data: T[] }>(...)).data` — same pattern as portal `use-knowledge.ts` (`f9c6156`).

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — **FIXED (verified)**

Mocks only when `useOfflineAdminData()` (DEV + mock access token). Live Knowledge/SLA reads and writes rethrow; no silent in-memory success on 401/403/404/5xx.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- Sidebar Knowledge / SLA rules entries are Admin-only
- `MarkdownPreview` renders React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV is client-side export of aggregates already authorized for Admin
- `useSlaRules` / `useUpdateSlaRule` call `GET`/`PATCH /admin/sla-rules` (path + body fallback)

## QA

Frontend smoke checklist: [phase5-qa.md](../../Phase/Dev%20C/phase5-qa.md) — code-verified; live smoke ready against Nest Admin JWT.
