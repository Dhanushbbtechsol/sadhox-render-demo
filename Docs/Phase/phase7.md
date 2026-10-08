# Phase 7 — EndUser desk: Incidents, Service Catalog, labels & seed

**Status:** designed / not started (2026-10-08)  
**Do not rebuild** Knowledge Base, projects, or SLA. This phase is nav, labels, incident subcategory, catalog grouping, and richer seed.

Real surfaces (ignore sample names like `CatalogView.tsx`, `prisma/seed.ts`, `apps/server/src/db/`):

| Today | Where |
|-------|--------|
| Sidebar | `apps/web/src/components/layout/app-sidebar.tsx` |
| EndUser home for incidents | `/portal` + `/portal/incidents/:id` |
| Agent incident queue | `/incidents` — roles Admin, Agent, Manager only |
| Catalog | `/catalog`, table `service_catalog.department` (no category/subcategory columns) |
| Incident category | `incidents.category` varchar; DTO allow-list Hardware, Software, Network, Access, Email, Other. **No subcategory.** |
| Problems | Already hidden from EndUser (sidebar + route). Keep it that way. |
| Seed | Nest/Drizzle scripts under `apps/server` (not Prisma) |

---

## EndUser sidebar (only these four)

| Label | Route | Behavior |
|-------|--------|----------|
| **Incidents** | `/incidents` | Report Incident + own list + live status. Replaces **My Portal**. |
| **Service Requests** | `/requests` | Rename label only (was Requests). |
| **Service Catalog** | `/catalog` | Rename label only (was Catalog). Each item keeps a **Request Service** action (catalog request dialog already exists — do not add a second ticket type). |
| **Knowledge Base** | `/knowledge` | Unchanged browse. Expand **seed** articles only. |

Agent / Admin / Manager nav stays. Problems stay off the EndUser sidebar and `/problems` stays 403 for EndUser.

`/portal` and `/portal/incidents/:id` redirect to `/incidents` and `/incidents/:id`. EndUser incident detail stays the read-only portal view (no assign / problem-link controls).

---

## Schema (smallest diff)

| Change | Notes |
|--------|--------|
| `incidents.subcategory` | `varchar`, required on create. `category` stays. Validate subcategory belongs to that category in the DTO (one map, not a new table). |
| `service_catalog.subcategory` | `varchar`, nullable for old rows. **Category = existing `department`.** Do not add a `categories` table or a second category column. |
| Knowledge | No schema change. Seed more Published articles. |

Incident categories (replace the six-value allow-list):

| Category | Subcategories |
|----------|----------------|
| Hardware | Laptop/Desktop, Mobile Device, Monitor/Peripherals, Printer/Scanner |
| Software & OS | Operating System, Standard Productivity Apps, Enterprise Software (ERP/CRM), Developer Tools |
| Network & Connectivity | Wi-Fi / LAN, VPN Access, Remote Desktop / VDI, DNS / Firewall |
| Identity & Access | Password Reset, Multi-Factor Authentication (MFA), Single Sign-On (SSO), Role Permissions |
| Collaboration | Email & Calendar, Messaging (Slack/Teams), Video Conferencing, File Sharing / Cloud Storage |

Labels only. This phase does **not** implement SSO, MFA, or VPN.

Catalog seed: group items with `department` = those category names and `subcategory` = a concrete service (for example department `Hardware`, subcategory `Laptop request`). Keep existing items; retag them instead of duplicating.

Knowledge seed (Published), titles:

- MFA Reset & Setup Guide
- Connecting to Corporate VPN (Windows / macOS / Linux)
- Requesting New Software Licenses & Approvals
- Troubleshooting Wi-Fi & Network Authentication Errors
- Printer Installation & Driver Setup Instructions

---

## Tracks

| Dev | Work | Plan |
|-----|------|------|
| **D** | Migration + DTO category/subcategory map; catalog subcategory; seed incidents/catalog/KB | [Dev D/phase7.md](./Dev%20D/phase7.md) |
| **A** | EndUser `/incidents` (report + own list + read-only detail); drop portal nav; subcategory on report form | [Dev A/phase7.md](./Dev%20A/phase7.md) |
| **B** | Sidebar labels Service Catalog / Service Requests; Request Service stays on catalog cards; catalog subcategory on admin form if the API sends it | [Dev B/phase7.md](./Dev%20B/phase7.md) |
| **C** | No new admin surface. Confirm Problems still absent for EndUser. | — |

## Out of scope

SSO/MFA product features, a categories lookup table, rebuilding KB, a second “report incident” flow inside a catalog item (catalog stays service requests).
