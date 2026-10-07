 # Dev B — Phase 5: End User Knowledge Portal & Catalog Admin CRUD (Week 5 / Days 21–25)

**Goal:** End User / Agent Knowledge Base browse and search; Admin Service Catalog item CRUD UI; optional related help from catalog items.

**Context:** Phases 1–4 remain historical. Coverage: [coverage-matrix.md](../coverage-matrix.md). Backend contract: [Dev D Phase 5](../Dev%20D/phase5.md).

---

- **Day 21–22: Knowledge browse & search**
  - Routes: `/knowledge` (list/browse by category + search), `/knowledge/:slug` (article view).
  - React Query against `GET /knowledge/articles` and categories; show **Published** only for EndUser/Agent.
  - Empty states, loading, and role-gated nav entry (portal + agent shell as appropriate).

- **Day 23: Admin Service Catalog CRUD UI**
  - Admin UI to create / edit / deactivate catalog items (name, description, active flag, `formFields` JSON).
  - Wire to Dev D `POST` / `PATCH /service-catalog`.
  - Keep existing End User browse + submit flow working.

- **Day 24: Catalog ↔ help articles**
  - On catalog item page (or request modal): “Related help articles” using category match or agreed tag/slug convention with Dev D seed data.
  - Deep-link to `/knowledge/:slug`.

- **Day 25: QA walkthrough**
  - Walkthrough: EndUser searches KB → opens article → starts request/incident with context.
  - Verify Admin-only catalog writes (EndUser/Agent → 403 on write APIs).
  - Polish copy and edge cases (no results, inactive catalog items).
  - Checklist: [phase5-day25-qa.md](./phase5-day25-qa.md).

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| Knowledge read/search APIs | Dev D | Day 22 |
| `POST` / `PATCH /service-catalog` | Dev D | Day 23 |
| Admin route gates | Dev D / existing `@Roles('Admin')` | Catalog CRUD UI |

## Explicitly out of scope

- Admin KB authoring (Draft/Publish) — Dev C  
- Ticket–article link panel on incident detail — Dev A  
- SLA rules editor — Dev C  

**← Previous:** [Phase 4](./phase4.md)
