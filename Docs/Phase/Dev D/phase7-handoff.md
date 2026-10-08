# Dev D — Phase 7 handoff (for Devs A / B / C)

**Date:** 2026-10-08  
**Owner:** Dev D  
**Scope:** Incident/catalog `subcategory` columns, shared category→subcategory map, create/update validation, catalog free-text subcategory.  
**Design:** [Docs/Phase/phase7.md](../phase7.md)  
**Contract:** [Docs/contracts/phase7-openapi.md](../../contracts/phase7-openapi.md)  
**Prior:** Phase 6 freeze still applies ([phase6-openapi.md](../../contracts/phase6-openapi.md)).

Consume against **local** Nest + Postgres (`127.0.0.1:5437`). Do not point tools at the TL host without go-ahead.

---

## Status summary

| Area | Status |
| --- | --- |
| Migration `0011_phase7_subcategory` (local) | **Done** — `incidents.subcategory` NOT NULL default `Other`; `service_catalog.subcategory` nullable |
| Shared map + incident DTO/service | **Done** |
| Catalog subcategory DTO/service | **Done** (free text; not map-validated) |
| Seed retag + five KB articles (Step 4) | **Done** (local; idempotent — second run no-ops) |
| TL host migrate | **Blocked** — unreachable / do not touch without go-ahead |
| Incident category data remap | **Not doing** — legacy rows keep old category + `Other` |

---

## Map location (copy for UI — no API)

**File:** `apps/server/src/incidents/incident-category-map.ts`  
**Export:** `INCIDENT_CATEGORY_SUBCATEGORY_MAP`  
**Snapshot test:** `incident-category-map.spec.ts`

Phase 7 does **not** add a map endpoint. Keep your frontend copy in sync; map edits are deliberate (snapshot will fail).

---

## Dev A — required frontend changes

Do **not** leave these on the old six-value list; create will **400**:

| File | Change |
| --- | --- |
| `apps/web/src/types/itsm.ts` | Replace `INCIDENT_CATEGORIES` with Phase 7 categories (or import/mirror the server map) |
| `apps/web/src/components/incidents/create-incident-dialog.tsx` | Add **subcategory** select filtered by category; send both on create |

Also per phase7.md: EndUser **Incidents** replaces My Portal; report + own list + read-only detail; subcategory on report form.

Legacy list/detail may still show old `category` / `subcategory: "Other"` — display as-is.

---

## Dev B

| Item | Notes |
| --- | --- |
| Sidebar | Labels **Service Catalog** / **Service Requests** (routes unchanged) |
| Catalog cards / Admin form | Show `subcategory` when present; category field remains **`department`** |
| Request Service | Keep existing catalog request dialog (no second ticket type) |
| Catalog departments after seed | `Hardware`, `Network & Connectivity`, `Software & OS`, `Identity & Access` — grid grouping + Related Help (`category.name === department`) now align with Phase 7 KB categories for those names. Old KB categories (`IT Hardware` / `Access` / `Data`) remain for legacy articles only. |
| Web mocks | `apps/web/src/lib/mocks/service-catalog.ts` still uses old departments if mock mode is on — update when wiring live API |

---

## Dev C

- No new Admin map UI.
- Confirm Problems remain unreachable for EndUser (sidebar + `/problems` 403).

---

## Seed / KB (Step 4 landed)

| Catalog retag (by name, these five only) | department / subcategory |
| --- | --- |
| Request Laptop | Hardware / Laptop request |
| External Monitor | Hardware / Monitor request |
| VPN Access | Network & Connectivity / VPN access request |
| Software License | Software & OS / Software license request |
| Database Access | Identity & Access / Database access request |

Five new Published KB articles (author `admin@sadhox.local`); skip if slug or title exists. Five new knowledge categories mirror incident category names; existing IT Hardware / Access / Data left alone.

**Handoff note:** article bodies are **starter content** for the IT team to review — generic plain text, no invented URLs, hostnames, phone numbers, or vendor names.

Showcase/scenario **new** inserts use valid map pairs + subcategory; existing showcase rows are not rewritten (idempotent skip).

---

## Local verification (Dev D checkpoint)

| Check | Result (2026-10-08, Steps 1–4) |
| --- | --- |
| `check-types` / `lint` | pass (re-run after Step 4) |
| Full vitest | **55 files / 632 tests** pass |
| Local journal | **11** rows through `0011_phase7_subcategory` |
| Seed ×2 | first retags/creates; second skips all catalog + Phase 7 KB |
| DB | local docker only; `DATABASE_URL` host printed as `127.0.0.1` |

---

## Blocked / needs decision

1. **TL migrate** — blocked.  
2. **Frontend map copies** — Dev A/B must update (`itsm.ts`, create-incident dialog; catalog subcategory display).  
3. Optional later: remap legacy incident categories (explicitly out of Phase 7 Dev D unless approved).
