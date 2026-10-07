# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-07. Combined: [phase5.md](../phase5.md).

## Medium — Open

### [A04 / A08] Knowledge list hooks ignore API `{ data }` envelope — `apps/web/src/features/admin/hooks.ts`

**Still open.** `GET /knowledge/categories` and `GET /knowledge/articles` return `{ data: T[] }`. Admin hooks still type/fetch as bare arrays. Portal `use-knowledge.ts` unwraps correctly.

**Fix (ponytail):** unwrap once, e.g. `(await apiFetch<{ data: T[] }>(...)).data`.

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — same file

**Still open.** `catch { if (import.meta.env.DEV) return/update mocks }` on category/article **and** SLA reads/writes. SLA Nest API now exists (Dev D), but live failures can still silently succeed against in-memory mocks in DEV.

**Fix:** only use mocks when `useOfflineAdminData()` is true; otherwise rethrow.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- `MarkdownPreview` renders React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV is client-side export of aggregates already authorized for Admin

## Unblocked

SLA table editor can hit live `GET`/`PATCH /admin/sla-rules` once hooks stop swallowing errors into mocks.
