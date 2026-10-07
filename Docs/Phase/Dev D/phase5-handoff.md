# Dev D — Phase 5 handoff (for Devs A / B / C)

**Date:** 2026-10-06  
**Owner:** Dev D  
**Scope:** Knowledge Base API, Admin SLA rules API, Service Catalog write API.

Staging / Render migration for Phase 5 schema is **on hold** pending the Phase 4 Render deployment decision. Consume the contract against local (or shared lab) Nest + Postgres for now.

---

## OpenAPI / Swagger

When Nest runs with `NODE_ENV !== production`, Swagger UI is at:

- **UI:** `http://localhost:3000/docs` (or your `PORT`)
- **Generated from:** Nest decorators on controllers under `apps/server/src/**`

Source of truth for request/response shapes is the live Swagger document (and the DTO classes it reflects), not a checked-in OpenAPI YAML.

---

## Knowledge Base

**Module:** `apps/server/src/knowledge/`  
**Base path:** `/knowledge`  
**Ticket link types:** `incident` | `service_request` | `problem` only (`change` is **not** supported yet).

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/knowledge/categories` | Admin, Agent, EndUser |
| `POST` | `/knowledge/categories` | Admin |
| `PATCH` | `/knowledge/categories/:id` | Admin |
| `DELETE` | `/knowledge/categories/:id` | Admin |
| `GET` | `/knowledge/articles?q=&categoryId=` | Admin, Agent, EndUser — Agent/EndUser see **Published** only; Admin also sees **Draft** |
| `POST` | `/knowledge/articles` | Admin |
| `GET` | `/knowledge/articles/:idOrSlug` | Admin, Agent, EndUser (Draft hidden from non-Admin) |
| `PATCH` | `/knowledge/articles/:id` | Admin |
| `DELETE` | `/knowledge/articles/:id` | Admin |
| `GET` | `/knowledge/tickets/:ticketType/:ticketId/links` | Admin, Agent, EndUser (ticket ACL / IDOR checks apply) |
| `POST` | `/knowledge/tickets/:ticketType/:ticketId/links` | Admin, Agent — body `{ articleId }` (Published articles only) |
| `DELETE` | `/knowledge/tickets/:ticketType/:ticketId/links/:articleId` | Admin, Agent |

List endpoints return a `{ data: [...] }` envelope — unwrap `data` in clients (portal hooks already do; Admin hooks must match).

---

## Admin SLA rules

**Controller:** `apps/server/src/admin/admin.controller.ts`  
**Table:** `sla_rules` (`responseMinutes` / `resolveMinutes` per `P1`–`P4`).

| Method | Path | Roles | Body / notes |
| --- | --- | --- | --- |
| `GET` | `/admin/sla-rules` | Admin | Returns `SlaRule[]`: `{ id, priority, responseMinutes, resolveMinutes, createdAt }` |
| `PATCH` | `/admin/sla-rules/:priority` | Admin | **Preferred by web UI** — body `{ responseMinutes, resolveMinutes }` |
| `PATCH` | `/admin/sla-rules` | Admin | Fallback — body `{ priority, responseMinutes, resolveMinutes }` |

Validation: priority ∈ `P1`–`P4`; minutes positive integers; `resolveMinutes >= responseMinutes`. Seed defaults already satisfy this (P1 15/240, P2 60/480, P3 240/1440, P4 480/4320).

Web client: `apps/web/src/features/admin/hooks.ts` (`useSlaRules` / `useUpdateSlaRule`).

---

## Service Catalog writes

**Controller:** `apps/server/src/service-catalog/service-catalog.controller.ts`

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/service-catalog` | Admin, Agent, EndUser (`includeInactive` honored for Admin only) |
| `POST` | `/service-catalog` | Admin — create item + `formFields` |
| `PATCH` | `/service-catalog/:id` | Admin — update / soft-deactivate (`isActive: false`) |

Writes run through `sanitizePlainText` (same choke point as Knowledge). Select `formFields[].options` capped at **50** items, each ≤ **128** chars.

---

## Consumer map (quick)

| Dev | Surfaces |
| --- | --- |
| **A** | Ticket–article links; portal related articles |
| **B** | Catalog Admin CRUD UI; KB categories (as needed) |
| **C** | Admin KB authoring; Admin SLA rules table editor; dashboard |

---

## Explicitly not in this handoff

- Drag-and-drop SLA builder  
- Staging/Render migrate for `0009_knowledge_base` (blocked on Phase 4 deploy decision)  
- Expanding `knowledge_ticket_type` to include `change`

**Phase plan:** [phase5.md](./phase5.md)
