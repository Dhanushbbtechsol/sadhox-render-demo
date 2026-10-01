# Remote schema lock — 2026-09-30 (Dev D)

Target: `192.168.68.111:5437` / db `sadhox`  
Verifier: `node scripts/full-schema-diff.mjs` (from `apps/server` with `.env`).

## App-owned migrations (must match repo files)

| Tag | Notes |
| --- | --- |
| `0000_same_tag` … `0005_phase3_request_fulfillment` | Reconciled earlier (see history below) |
| `0006_phase4_assets_finance_indexes` | Dev-C — adds `purchase_cost` + status/linked-ticket indexes |
| `0007_assets_asset_tag` | Was Dev-D `0006_assets_asset_tag` (renumbered on Audit merge) |

`resolution_notes` lives in **0003** (not 0004). See `drizzle/migrations/RENAME_0003_NOTE.md`.

## Drift resolution

| Object | Resolution |
| --- | --- |
| `assets.purchase_cost` | **Kept** (Dev-C Phase 4). Dev-D drop migration was not merged. |
| Orphan journal hash `486f350a…` | Removed earlier so journal matched repo tags. |

## Re-check

```bash
cd apps/server
node scripts/full-schema-diff.mjs
# expect missingCols=0, extraCols=0, missingIdx=0, all journal tags APPLIED_HASH_MATCH
```
