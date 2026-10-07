# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md).

## Medium — Resolved

### [A04 / A08] Knowledge list hooks ignore API `{ data }` envelope — **FIXED (verified)**

`unwrapKnowledgeList` in `features/admin/hooks.ts` for categories + articles (tolerates bare arrays for stale cache). Same pattern as portal `use-knowledge.ts`.

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — **FIXED (verified)**

Knowledge/SLA live paths use `useOfflineAdminData()` only for mocks; live failures rethrow (SLA update has alternate-endpoint fallback, not mock).

## Low — Open

### [A04 / A07] Residual DEV `catch → mock` on assets / dashboard / audit / queues

`features/admin/hooks.ts` still returns mocks on live API failure for non-Knowledge admin reads when `import.meta.env.DEV` (outside `useOfflineAdminData()`).

**Fix:** rethrow unless `useOfflineAdminData()`.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- Sidebar Knowledge / SLA rules entries are Admin-only
- `MarkdownPreview` renders React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV is client-side export of aggregates already authorized for Admin
- `useSlaRules` / `useUpdateSlaRule` call `GET`/`PATCH /admin/sla-rules` (path + body fallback)

## QA

Frontend smoke checklist: [phase5-qa.md](../../Phase/Dev%20C/phase5-qa.md) — code-verified; live smoke ready against Nest Admin JWT.
