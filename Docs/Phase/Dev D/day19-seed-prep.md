# Day 19 — Production seed prep notes

**Do not run** against Render or any shared DB without explicit go-ahead.

## Script

`apps/server/scripts/seed-production.ts`

Guard: requires `ALLOW_PRODUCTION_SEED=1`.

```bash
# WHEN APPROVED ONLY:
cd apps/server
ALLOW_PRODUCTION_SEED=1 DATABASE_URL='postgresql://…' pnpm exec tsx scripts/seed-production.ts
```

## What it seeds

| Data | Source | Notes |
| --- | --- | --- |
| Admin `admin@sadhox.local` | New user if missing | Random password via `generateSeedPassword()`; printed **once** to stdout; **not** written to `.seed-password` |
| `sla_rules` P1–P4 | Same numbers as `scripts/seed.ts` | 15/240, 60/480, 240/1440, 480/4320 |
| Service catalog | `CATALOG_SEED` in `src/service-catalog/catalog.seed.ts` | Dev B catalog module — departments: IT Hardware, Access, Data |

## What it deliberately skips

- Agent / EndUser demo users  
- `[Showcase]` incidents / SRs / changes  
- Any password file on disk  

## Catalog categories — no invention

Clear source found: `apps/server/src/service-catalog/catalog.seed.ts`, already consumed by `scripts/seed.ts` and expected by Dev B’s `GET /service-catalog` + frontend `useServiceCatalog()` (groups by `department`).

No open question for inventing categories.
