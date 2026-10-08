# Phase 7 audit — 2026-10-08 (post merge-to-audit)

Scope: `Audit` after `Dev-A-`, `Dev-B`, and `Dev-D` (EndUser `/incidents`, catalog subcategory, category map, seed retag). Diff base: `102d522`. Stack: NestJS + Drizzle + Passport JWT + React/Vite. No `.review.yml` (Sonar defaults). Dev C had no Phase 7 diff.

**Open findings (Phase 7): 0 Critical · 0 High · 0 Medium · 1 Low** (duplicate category maps).  
**Pass/fail:** Dev A **PASS** · Dev B **PASS** · Dev C **PASS** · Dev D **PASS** (Low alone does not fail).

**Owners:** [Dev A](./Dev%20A/phase7.md) · [Dev B](./Dev%20B/phase7.md) · [Dev C](./Dev%20C/phase7.md) · [Dev D](./Dev%20D/phase7.md)

## What changed

EndUser incident desk moved from `/portal` to `/incidents` (own list, report form, read-only detail). Catalog and request labels renamed. Incident category/subcategory is an allow-list; catalog subcategory is free text on the existing Admin catalog API. Seed retags the five catalog rows and adds five Published KB articles.

## Verified

| Control | Evidence |
| --- | --- |
| EndUser list/get stays own-row | `buildFilters` forces `reporterId`; `assertCanRead` 403s other ids |
| EndUser cannot mutate/assign/link problems | `@Roles` on `PATCH`, `assign`, `linked-assets`; Problems route still Admin/Agent/Manager |
| Detail controls are not the boundary | `IncidentDetailGate` is client-only; staff actions 403 for EndUser |
| Create pair is server-checked | `CreateIncidentDto` `@IsIn` + map constraint; service rejects a bad pair before insert |
| Update pair checked when the value changes | `incidents.service.ts` `categoryChanged` / `subcategoryChanged`; unchanged legacy `Other` can be re-sent |
| Priority still computed server-side | create uses `priorityCalc`, not the client preview |
| Assign still staff-only | `canAssignIncident` plus UI `canAssign` |
| Catalog writes stay Admin | `POST`/`PATCH` catalog `@Roles("Admin")`; subcategory sanitized, max 128 |
| Queries stay parameterized | Drizzle `eq` / `and`; no new raw SQL |
| KB bodies render as text | `knowledge-detail.tsx` `renderBody` splits lines; no `dangerouslySetInnerHTML` |

## Low / Hardening

### [A08] Two server category maps — Dev A + Dev D

`apps/server/src/incidents/incident-categories.ts` and `incident-category-map.ts` are the same allow-list. Create checks both (`incidents.service.ts` around the create method). Update checks only `incident-category-map`. The web form copies `incident-categories` (`apps/web/src/types/incident-categories.ts`).

They match today. If one list is edited, create and update can disagree, and the form can offer a pair the update path accepts.

**Fix:** keep `incident-category-map.ts` only. Point the service and the web copy at that module. Delete `incident-categories.ts`.

## Phase 6 / Phase 4 carryovers (not Phase 7)

| Sev | Item |
| --- | --- |
| Low | `seed.ts` `ChangeMe123!` when `SEED_PASSWORD` is unset (password hash still re-synced for seed emails) |
| Medium | CSRF on `SameSite=None` refresh cookie |
| Low | `THROTTLE_GLOBAL_LIMIT` prod ceiling; `/auth/logout` throttle; WS auth → Sentry |

## Review checklist (Sonar)

1. EndUser `GET /incidents` and `GET /incidents/:id` for someone else’s id → own rows only / 403.
2. EndUser `PATCH /incidents/:id` and `POST /problems` → 403. Sidebar has no Problems link for EndUser.
3. Create with category `Hardware` and subcategory `Email & Calendar` → 400. A matching pair → 201 and a server-calculated priority.
4. Staff PATCH that changes category without a matching subcategory → 400. PATCH that re-sends a stored legacy category and only changes status → 200.
5. Non-Admin `POST /service-catalog` with `subcategory` → 403. Admin create persists a sanitized subcategory.
6. Re-run migrate: the three `0011_phase7_*` journal entries are `IF NOT EXISTS` and should no-op after the first apply.

## Not checked / out of scope

- Browser walkthrough of the EndUser desk
- `pnpm-lock.yaml` CVE scan
- Staging TLS, cookie flags, secret stores
- SSO/MFA product features (labels and KB text only)
