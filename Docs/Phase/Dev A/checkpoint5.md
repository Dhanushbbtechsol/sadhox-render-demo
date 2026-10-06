# Checkpoint 5 — Phase 5 (Dev A)

**Date:** 2026-10-06  
**Source of truth:** [phase5.md](./phase5.md)

## Days 21–25 vs `phase5.md`

| Day | Requirement | Evidence |
| --- | --- | --- |
| 21 | React Query hooks/types + Agent Knowledge nav | `hooks/use-knowledge.ts`, `types/knowledge.ts`, sidebar `/knowledge` |
| 21 | Detail layout slot for Related articles | `RelatedArticles` on incident + problem detail |
| 22–23 | Search Published + link/unlink | `GET /knowledge/articles?q=`; `POST`/`DELETE` `/knowledge/tickets/:type/:id/links` |
| 24 | Portal incident detail (read-only agent controls) | `/portal/incidents/:id` — no assign / Link-to-problem; KB links `readOnly` |
| 25 | RBAC: EndUser cannot write articles; Agent can link; unauth → 401 | `rbac-matrix.spec.ts` Knowledge rows |

## Contract (consumed)

- `GET /knowledge/categories`
- `GET /knowledge/articles?q=&categoryId=`
- `GET /knowledge/articles/:idOrSlug`
- `GET/POST /knowledge/tickets/:ticketType/:ticketId/links`
- `DELETE /knowledge/tickets/:ticketType/:ticketId/links/:articleId`

Backend foundation (schema + `KnowledgeModule` + seed) landed on this branch so the walkthrough is runnable; Admin authoring UI remains Dev C, richer End User KB shell remains Dev B.

## Verification

```bash
pnpm --filter server check-types
cd apps/server && pnpm exec vitest run src/common/rbac-matrix.spec.ts src/knowledge/knowledge.ticket-type.spec.ts
pnpm --filter web check-types   # known pre-existing asset-form-dialog nullability noise
```

## Walkthrough

1. Migrate + seed (`0009_phase5_knowledge_base`, knowledge seed articles).
2. Agent opens incident → Related articles → search → link Published article.
3. EndUser opens portal ticket → sees linked article (read-only) → opens `/knowledge/:slug`.
4. EndUser `POST /knowledge/articles` → 403; unauthenticated → 401.
