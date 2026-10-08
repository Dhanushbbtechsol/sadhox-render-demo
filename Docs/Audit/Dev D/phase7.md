# Security Audit: Dev D (Phase 7)

Audit 2026-10-08 (post merge-to-audit). Combined: [phase7.md](../phase7.md). **PASS / CLEAN.**

Category/subcategory columns, DTO map check, catalog subcategory column, and Phase 7 seed (catalog retag + five Published articles). Create rejects pairs outside the map. Update validates only when category or subcategory actually changes, so a stored legacy value can be re-sent. Drizzle parameters only. KB seed is plain text.

## Low — Resolved

### [A08] Twin category map — **FIXED** (2026-10-08)

Kept `incident-category-map.ts` as the only server allow-list. Removed `incident-categories.ts` (and its spec). Create and update both use `isValidIncidentCategorySubcategory` from that module. Web UI copy is `apps/web/src/types/incident-categories.ts` and is documented to mirror `incident-category-map.ts`.

## Carryovers (not Phase 7)

- Low: `seed.ts` default `ChangeMe123!` when `SEED_PASSWORD` is unset
- Medium: Phase 4 CSRF on `SameSite=None` refresh
