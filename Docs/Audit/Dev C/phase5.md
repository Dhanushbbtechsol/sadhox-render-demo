# Security Audit: Dev C (Phase 5)

Reaudit 2026-10-06. Combined: [phase5.md](../phase5.md).

## Medium — Open

### [A04 / A08] Knowledge list hooks ignore API `{ data }` envelope — `apps/web/src/features/admin/hooks.ts`

`GET /knowledge/categories` and `GET /knowledge/articles` return `{ data: T[] }` (see `KnowledgeService`). Admin hooks type/fetch as bare arrays. Portal `use-knowledge.ts` unwraps correctly.

**Impact:** list queries mis-handle the payload; in DEV, `catch` paths often fall through to mocks so authoring looks “live” while not reflecting DB.

**Fix (ponytail):** unwrap once, e.g. `(await apiFetch<{ data: T[] }>(...)).data` — same pattern as `use-knowledge.ts`.

### [A04 / A07] DEV mock fallback on Knowledge / SLA API errors — same file

`catch { if (import.meta.env.DEV) return/update mocks }` on category/article **and** SLA reads/writes. Combined with missing `/admin/sla-rules` (Dev D), Admin SLA edits and some Knowledge list failures silently succeed against in-memory mocks.

**Fix:** only use mocks when `useOfflineAdminData()` is true; otherwise rethrow. Do not swallow live 401/403/404/5xx in authoring flows.

## Spot-checked (clean)

- `/admin/knowledge` and `/admin/sla-rules` behind Admin `ProtectedRoute`
- `MarkdownPreview` renders React text nodes (no `dangerouslySetInnerHTML`)
- Dashboard CSV is client-side export of aggregates already authorized for Admin

## Blocked on Dev D

SLA table editor cannot be verified end-to-end until Admin SLA rules API exists.
