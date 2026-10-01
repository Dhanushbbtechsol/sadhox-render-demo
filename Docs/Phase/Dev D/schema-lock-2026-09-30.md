# Remote schema lock — 2026-09-30 (Dev D)

Target: `192.168.68.111:5437` / db `sadhox`  
Verifier: `node scripts/full-schema-diff.mjs` (from `apps/server` with `.env`).

## App-owned migrations (must match repo files)

| Tag | Notes |
| --- | --- |
| `0000_same_tag` … `0006_assets_asset_tag` | Reconciled earlier (see history below) |
| `0007_assets_drop_purchase_cost` | Drops unmanaged `assets.purchase_cost` |

`resolution_notes` lives in **0003** (not 0004). See `drizzle/migrations/RENAME_0003_NOTE.md`.

## Drift resolution

| Object | Resolution |
| --- | --- |
| `assets.purchase_cost` | **Dropped** via `0007_assets_drop_purchase_cost` (unused in app/frontend). Apply on TL remote when host is up; on Render via migration runbook at first migrate. |
| Orphan journal hash `486f350a…` | Removed earlier so journal matched repo tags. |

## Re-check

```bash
cd apps/server
node scripts/full-schema-diff.mjs
# expect missingCols=0, extraCols=0, missingIdx=0, all journal tags APPLIED_HASH_MATCH
```
