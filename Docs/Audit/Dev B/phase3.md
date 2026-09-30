# Security Audit: Dev B (Phase 3)

Audit 2026-09-29. Combined: [phase3.md](../phase3.md).

## Medium — Open

### [A08] Three migrations share `0003_` filename prefix

**Where:** `apps/server/drizzle/migrations/` + `meta/_journal.json`

**Bug:** Merge left three Phase 3 SQL files all prefixed `0003_`:
- `0003_phase3_incident_workflow.sql` (Dev A)
- `0003_incidents_sla_breached.sql` (Dev D)
- `0003_phase3_request_fulfillment.sql` (Dev B)

Journal `idx` order is correct today; fresh DBs and humans will mis-order or double-apply.

**Do:** (same pattern as Phase 2 `RENAME_0002_NOTE.md`)
1. Renumber to sequential tags/files, e.g.:
   - `0003_phase3_incident_workflow`
   - `0004_incidents_sla_breached`
   - `0005_phase3_request_fulfillment`
2. Update `meta/_journal.json` tags + idxs to match.
3. Add `drizzle/migrations/RENAME_0003_NOTE.md` for shared DBs that already applied the old names.
4. Verify `drizzle` migrate on a clean DB.

Coordinate with Dev A / Dev D so nobody reintroduces a second `0003_`.

## Not yours

- PATCH assignee role check → Dev A
- Duplicate assign email → Dev A + Dev D
- `/health/ready` → Dev D
