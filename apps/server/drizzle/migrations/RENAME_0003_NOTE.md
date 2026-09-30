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
