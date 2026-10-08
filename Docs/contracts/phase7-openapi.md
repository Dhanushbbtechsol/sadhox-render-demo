# Phase 7 API contract (Dev D → Devs A / B / C)

**Frozen:** 2026-10-08  
**Prior freeze:** [phase6-openapi.md](./phase6-openapi.md) (still in force; this doc adds Phase 7 deltas only)  
**Runtime Swagger UI:** `http://localhost:3000/docs` (`NODE_ENV !== production`)  
**Handoff:** [Docs/Phase/Dev D/phase7-handoff.md](../Phase/Dev%20D/phase7-handoff.md)  
**Design authority:** [Docs/Phase/phase7.md](../Phase/phase7.md)

Phase 6 paths/roles are unchanged. Phase 7 adds incident/catalog **subcategory** fields and replaces the incident category allow-list.

---

## Shared category → subcategory map

**Single source of truth (server):**  
`apps/server/src/incidents/incident-category-map.ts` → `INCIDENT_CATEGORY_SUBCATEGORY_MAP`

| Category | Subcategories |
| --- | --- |
| Hardware | Laptop/Desktop, Mobile Device, Monitor/Peripherals, Printer/Scanner |
| Software & OS | Operating System, Standard Productivity Apps, Enterprise Software (ERP/CRM), Developer Tools |
| Network & Connectivity | Wi-Fi / LAN, VPN Access, Remote Desktop / VDI, DNS / Firewall |
| Identity & Access | Password Reset, Multi-Factor Authentication (MFA), Single Sign-On (SSO), Role Permissions |
| Collaboration | Email & Calendar, Messaging (Slack/Teams), Video Conferencing, File Sharing / Cloud Storage |

- **No `"Other"`** in the product map (migration default `"Other"` is legacy-only).
- Snapshot test: `apps/server/src/incidents/incident-category-map.spec.ts` — any map change must be deliberate.
- **No new map endpoint.** Frontend must copy/keep the map in sync (Dev A report form; any Dev B UI that needs incident categories).

---

## Incidents — subcategory + new categories

| Change | Detail |
| --- | --- |
| Create body | `category` (required, map keys only) + `subcategory` (required, must belong to that category) |
| Update body | `category?`, `subcategory?` — pair validated against the map **only if** either value **changes** vs the stored row; re-sending unchanged legacy values (old category / `"Other"`) is allowed |
| Responses | List + detail include `subcategory: string` |
| Legacy rows | Keep old `category` + `subcategory: "Other"`; editable without remap; changing category alone while subcategory is invalid for the new category → **400** asking for a new subcategory |
| Old six-value create | `Hardware`, `Software`, `Network`, `Access`, `Email`, `Other` as create categories → **400** (replaced by Phase 7 map) |

Swagger: `CreateIncidentDto` / `UpdateIncidentDto` in Nest.

---

## Service catalog — subcategory (department unchanged)

| Change | Detail |
| --- | --- |
| Category field | Remains **`department`** — do not rename or add a second category column |
| `subcategory` | Optional nullable string (max 128); **free text** — **not** validated against the incident map |
| Create / update | sanitize + max length (same hardening as Phase 5 reaudit) |
| Responses | List + create/update return `subcategory: string \| null` |

Swagger: `CreateCatalogItemDto` / `UpdateCatalogItemDto`.

---

## Frontend consumption (no new endpoint)

| Dev | Need |
| --- | --- |
| **A** | Copy map from `incident-category-map.ts` (or contract table above). Report form: category + subcategory selects. Update `apps/web/src/types/itsm.ts` `INCIDENT_CATEGORIES` and `create-incident-dialog.tsx` — server rejects old categories on create. |
| **B** | Show catalog `subcategory` on cards / Admin form when API sends it. Category field stays `department`. Sidebar label renames only (per phase7.md). |
| **C** | Confirm Problems still absent for EndUser. No new Admin surface for the map. |

Any change to `INCIDENT_CATEGORY_SUBCATEGORY_MAP` requires updating frontend copies.

---

## Seed (applied locally Step 4)

Catalog department/subcategory retag and five Published KB articles are seeded idempotently via `apps/server/scripts/seed.ts` + `catalog.seed.ts` / `knowledge.seed.ts`. See handoff for exact retag table and KB starter-body note.

## Explicitly not in this freeze / open

- Remapping existing incident `category` values (explicitly deferred; legacy rows stay)
- New GET endpoint for the category map
- Rebuilding Knowledge Base
- TL / remote DB migrate (`192.168.68.111`) without explicit go-ahead
