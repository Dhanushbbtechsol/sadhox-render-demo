# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-07 (pass 2). Combined: [phase5.md](../phase5.md).

## Medium — Resolved

### [A04 / A08] Knowledge list hooks ignore `{ data }` envelope — **FIXED (verified)**

`unwrapKnowledgeList` in `features/admin/hooks.ts` for categories + articles (tolerates bare arrays for stale cache).

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — **FIXED (verified)**

Knowledge/SLA live paths use `useOfflineAdminData()` only for mocks; live failures rethrow (SLA update has alternate-endpoint fallback, not mock).

## Low — Open

### [A04 / A07] Residual DEV `catch → mock` on assets / dashboard / audit / queues

Same file: live `catch { if (DEV) return mocks }` remains on non-Knowledge admin reads.

**Fix:** rethrow unless `useOfflineAdminData()`.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- `MarkdownPreview` React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV client-side of Admin-authorized aggregates
