# Security Audit: Dev D (Phase 7)

Audit 2026-10-08 (post merge-to-audit). Combined: [phase7.md](../phase7.md). **PASS** (Phase 7 High/Medium clean).

Category/subcategory columns, DTO map check, catalog subcategory column, and Phase 7 seed (catalog retag + five Published articles). Create rejects pairs outside the map. Update validates only when category or subcategory actually changes, so a stored legacy value can be re-sent. Drizzle parameters only. KB seed is plain text.

## Low — Open (shared with Dev A)

### [A08] Twin category map

`incident-category-map.ts` is the map update uses. `incident-categories.ts` is a second copy that create also checks. Keep this module, point create and `apps/web/src/types/incident-categories.ts` at it, delete the other file.

## Carryovers (not Phase 7)

- Low: `seed.ts` default `ChangeMe123!` when `SEED_PASSWORD` is unset
- Medium: Phase 4 CSRF on `SameSite=None` refresh
