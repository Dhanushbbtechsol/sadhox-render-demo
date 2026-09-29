# Migration rename note (Dev B Phase 2 audit A08)

`0001_phase2_catalog_approvals.sql` was renamed to `0002_phase2_catalog_approvals.sql`
so ordering is:

1. `0000_same_tag`
2. `0001_incidents_problems_phase2`
3. `0002_phase2_catalog_approvals`

If a shared DB already applied the old filename, update Drizzle’s migrations
table hash/tag for that row to `0002_phase2_catalog_approvals` (or mark it
applied under the new name) before running `db:migrate` again — do not re-run
the SQL if the catalog/approvals objects already exist.
