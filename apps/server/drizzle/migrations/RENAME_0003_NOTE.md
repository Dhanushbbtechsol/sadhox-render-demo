# Migration rename note (Dev B Phase 3 audit A08)

Three Phase 3 migrations previously shared a `0003_` filename prefix.
They were renumbered so ordering is:

1. `0000_same_tag`
2. `0001_incidents_problems_phase2`
3. `0002_phase2_catalog_approvals`
4. `0003_phase3_incident_workflow` (unchanged filename)
5. `0004_incidents_sla_breached` (was `0003_incidents_sla_breached`)
6. `0005_phase3_request_fulfillment` (was `0003_phase3_request_fulfillment`)

## Shared DBs that already applied the old names

If `__drizzle_migrations` (or Drizzle’s migrations table) already has rows tagged
`0003_incidents_sla_breached` and/or `0003_phase3_request_fulfillment`:

1. Update those row tags to `0004_incidents_sla_breached` and
   `0005_phase3_request_fulfillment` respectively (keep hashes if present).
2. Or mark the new tags as applied without re-running SQL.

Do **not** re-run the SQL if the objects already exist:

- `incidents.sla_breached` / `incidents.resolution_notes` / `incidents_sla_breach_idx`
- `service_requests.assignee_id` / `fulfillment_notes` / `fulfilled_at`

`0004_incidents_sla_breached.sql` uses `IF NOT EXISTS` and is safe to re-apply
if needed; `0003` / `0005` are not idempotent — prefer journal tag updates only.

## 2026-09-30 remote reconcile (Dev D)

Remote journal had been rebaselined with **0004's hash in the 4th slot**, skipping
`0003_phase3_incident_workflow`. That left `incidents.resolution_notes` (defined
only in 0003) absent even though `sla_breached` existed via 0004.

Reconcile (via `scripts/reconcile-remote-schema.mjs`):

1. Ensured `resolution_notes` present (`ADD COLUMN IF NOT EXISTS` — same DDL as 0003 stmt 2).
2. Inserted missing journal hashes for **0003** and **0005** (objects already on DB).
3. Added **`0006_assets_asset_tag`** for `assets.asset_tag` (in TypeScript schema, never migrated).

Later the same day: purged orphan journal hash `486f350a…` (no matching SQL in repo).

## 2026-10-01 Audit merge (Dev-C + Dev-D)

Dev-C and Dev-D both claimed `0006_*`. Audit keeps Dev-C finance indexes + `purchase_cost`
(schema/API use it). Dev-D asset_tag migration was renumbered; the Dev-D drop of
`purchase_cost` was **not** taken.

Final order:

1. `0006_phase4_assets_finance_indexes` (Dev-C — adds `purchase_cost` + indexes)
2. `0007_assets_asset_tag` (was Dev-D `0006_assets_asset_tag`)

### Shared DBs that already applied old Dev-D tags

If `__drizzle_migrations` has `0006_assets_asset_tag` and/or
`0007_assets_drop_purchase_cost`:

1. Retag the asset_tag row hash to match `0007_assets_asset_tag.sql` (same SQL body;
   only the filename/tag changed), **or** insert the new tag hash and leave the old
   hash as a no-op orphan to purge later.
2. If `purchase_cost` was dropped: re-apply `0006_phase4_assets_finance_indexes`
   (`ADD COLUMN IF NOT EXISTS` + indexes) and insert that journal hash.
3. Do **not** re-run a drop of `purchase_cost`.
