# Dev D — Phase 5: Knowledge Base Foundation, SLA Rules API & Catalog Writes (Week 5 / Days 21–25)

**Goal:** Backend foundation for Knowledge Base; Admin APIs for SLA rules table editing and Service Catalog item CRUD; seed + OpenAPI handoff to Devs A–C.

**Context:** Phases 1–4 remain historical. Coverage: [coverage-matrix.md](../coverage-matrix.md).

---

- **Day 21: Knowledge schema & migrations**
  - Add Drizzle tables in `apps/server/src/database/schema/index.ts`:
    - `knowledge_categories` — id, name, slug, description?, timestamps
    - `knowledge_articles` — id, title, slug, body, status (`Draft` | `Published`), categoryId, authorId, timestamps
    - `ticket_knowledge_links` — ticketId, ticketType (`incident` | `service_request` | `problem` as agreed), articleId, unique (ticketId, ticketType, articleId)
  - Generate/apply migration (next journal entry after current chain).
  - Do not break existing Phases 1–4 tables.

- **Day 22: KnowledgeModule + RBAC**
  - Nest `KnowledgeModule` with controllers/services.
  - Categories: `GET` (authenticated); `POST` / `PATCH` / `DELETE` **Admin**.
  - Articles: `GET /knowledge/articles?q=&categoryId=` (Published for Agent/EndUser; Admin sees Draft too); `GET` by id or slug.
  - Articles write: `POST` / `PATCH` / `DELETE` **Admin**.
  - Swagger + `@Roles()` on all routes; extend Day 16 401/403 matrix coverage for new paths.

- **Day 23: Links, SLA rules, catalog writes**
  - Ticket–article links: `GET` by ticket; `POST` / `DELETE` for **Admin** and **Agent**.
  - Admin SLA rules: `GET` / `PATCH` (or `/admin/sla-rules`) — edit `responseMinutes` / `resolveMinutes` per priority. **No** drag-drop builder.
  - Service catalog Admin writes: `POST` / `PATCH` on `/service-catalog` (create/edit/deactivate + `formFields`). Extend existing module; keep `GET` public-to-auth as today.

- **Day 24: Seed + contract freeze**
  - Seed sample categories and Published articles (and optional Draft for Admin demos).
  - Freeze OpenAPI for A/B/C consumption → [phase5-openapi.md](../../contracts/phase5-openapi.md) + live `/docs`.
  - Unit/e2e API tests for Knowledge, SLA rules PATCH, catalog POST/PATCH.

- **Day 25: Checkpoint**
  - Staging / remote migrate: **deferred to future** (not required to close Phase 5).
  - `/health` + RBAC matrix green including Knowledge routes.
  - Hand off Swagger/contract to Devs A–C → [phase5-handoff.md](./phase5-handoff.md).

---

## Interfaces published (Days 22–23)

| Surface | Consumers | Notes |
|---|---|---|
| `GET/POST/PATCH/DELETE /knowledge/categories` | Devs B, C | Admin writes |
| `GET/POST/PATCH/DELETE /knowledge/articles` | Devs A, B, C | Search `q`, filter `categoryId` |
| Ticket–article link routes | Dev A | Admin/Agent mutate; list by ticket |
| `GET/PATCH` SLA rules (Admin) | Dev C | Table editor only |
| `POST/PATCH /service-catalog` (Admin) | Dev B | Catalog CRUD UI |

## Dependencies

- Devs A/B/C blocked on Day 22 stubs for UI wiring; full write paths by end of Day 23.
- Day 18–20 Render/go-live remains on Phase 4 track — not part of this phase.

## Explicitly out of scope

- Drag-and-drop SLA builder  
- Advanced BI / custom report builders  
- Render prod cutover (Phase 4 Day 18–20)  
- Staging / cloud migrate (pushed to future)

**← Previous:** [Phase 4](./phase4.md)
