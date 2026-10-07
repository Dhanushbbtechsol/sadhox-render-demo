# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md).

## Medium — Resolved

### [A04 / A08] Knowledge list hooks ignore API `{ data }` envelope — **FIXED (verified)**

`unwrapKnowledgeList` in `features/admin/hooks.ts` for categories + articles (tolerates bare arrays for stale cache). Same pattern as portal `use-knowledge.ts` (`f9c6156`).

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — **FIXED (verified)**

Mocks only when `useOfflineAdminData()` (DEV + mock access token). Live Knowledge/SLA reads and writes rethrow; no silent in-memory success on 401/403/404/5xx. SLA update has alternate-endpoint fallback, not mock.

## Low — Open

### [A04 / A07] Residual DEV `catch → mock` on assets / dashboard / audit / queues

`features/admin/hooks.ts` still returns mocks on live API failure for non-Knowledge admin reads when `import.meta.env.DEV` (outside `useOfflineAdminData()`).

**Fix:** rethrow unless `useOfflineAdminData()`.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- Sidebar Knowledge / SLA rules entries are Admin-only
- `MarkdownPreview` React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV client-side of Admin-authorized aggregates
- `useSlaRules` / `useUpdateSlaRule` call `GET`/`PATCH /admin/sla-rules` (path + body fallback)

## QA

Frontend smoke checklist: [phase5-qa.md](../../Phase/Dev%20C/phase5-qa.md) — code-verified; live smoke ready against Nest Admin JWT.
