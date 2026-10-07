# Phase 5 API contract freeze (Dev D → Devs A / B / C)

**Frozen:** 2026-10-07  
**Runtime Swagger UI:** `http://localhost:3000/docs` (`NODE_ENV !== production`)  
**Handoff narrative:** [Docs/Phase/Dev D/phase5-handoff.md](../Phase/Dev%20D/phase5-handoff.md)

This document freezes the Phase 5 surfaces for client wiring. Request/response field details follow Nest DTO + Swagger schemas; do not invent alternate paths.

## Knowledge (`/knowledge`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/knowledge/categories` | Admin, Agent, EndUser | `{ data: Category[] }` |
| POST | `/knowledge/categories` | Admin | body: `name`, `slug`, `description?` |
| PATCH | `/knowledge/categories/:id` | Admin | partial update |
| DELETE | `/knowledge/categories/:id` | Admin | fails if articles remain |
| GET | `/knowledge/articles` | Admin, Agent, EndUser | query: `q`, `categoryId`; non-Admin → Published only; `{ data }` |
| POST | `/knowledge/articles` | Admin | `title`, `slug`, `body`, `status`, `categoryId` |
| GET | `/knowledge/articles/:idOrSlug` | Admin, Agent, EndUser | Draft → 404 for non-Admin |
| PATCH | `/knowledge/articles/:id` | Admin | partial update |
| DELETE | `/knowledge/articles/:id` | Admin | |
| GET | `/knowledge/tickets/:ticketType/:ticketId/links` | Admin, Agent, EndUser | `ticketType`: `incident` \| `service_request` \| `problem` |
| POST | `/knowledge/tickets/:ticketType/:ticketId/links` | Admin, Agent | body `{ articleId }` — Published only |
| DELETE | `/knowledge/tickets/:ticketType/:ticketId/links/:articleId` | Admin, Agent | |

## Admin SLA rules (`/admin`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/admin/sla-rules` | Admin | `SlaRule[]` |
| PATCH | `/admin/sla-rules/:priority` | Admin | preferred; body `{ responseMinutes, resolveMinutes }` |
| PATCH | `/admin/sla-rules` | Admin | fallback; body includes `priority` |

`priority` ∈ `P1`–`P4`; `resolveMinutes >= responseMinutes`.

## Service catalog (`/service-catalog`)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/service-catalog` | Admin, Agent, EndUser | `{ data }`; `includeInactive` Admin-only |
| POST | `/service-catalog` | Admin | create + `formFields` |
| PATCH | `/service-catalog/:id` | Admin | update / `isActive: false` |

## Explicitly not frozen / out of scope

- Drag-and-drop SLA builder  
- `knowledge_ticket_type` = `change`  
- Staging/Render migrate for `0009_phase5_knowledge_base` (deferred / on hold pending Phase 4 deploy decision)
