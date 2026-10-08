# Dev D — Phase 7: Category map, subcategory columns, seed

**Design:** [../phase7.md](../phase7.md). Do not rebuild KB.

- Migration: `incidents.subcategory` varchar not null default `Other` (then app requires a real value); `service_catalog.subcategory` varchar null.
- One category → subcategory map shared by the incident DTO (`@IsIn` per category). Catalog category remains `department`.
- Seed: retag catalog `department` / set `subcategory`; add the five Published KB articles from phase7.md. Idempotent (skip if slug/title exists).
