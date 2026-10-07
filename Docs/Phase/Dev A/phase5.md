# Dev A — Phase 5: Ticket–Knowledge Links & Portal Detail (Week 5 / Days 21–25)

**Goal:** Link Knowledge Base articles to Incidents/Problems; close the End User portal incident detail gap; Agent-facing related articles on ticket detail.

**Context:** Phases 1–4 remain historical. Coverage: [coverage-matrix.md](../coverage-matrix.md). Backend contract: [Dev D Phase 5](../Dev%20D/phase5.md).

---

- **Day 21: Client stubs & navigation**
  - Add React Query hooks/types against Dev D Knowledge OpenAPI stubs.
  - Optional Agent sidebar entry to read-only Knowledge browse (or deep-link to Dev B `/knowledge`).
  - Confirm Incident/Problem detail layout slots for a “Related articles” panel.

- **Day 22–23: Link articles on ticket detail**
  - Incident detail (`/incidents/:id`) and Problem detail (`/problems/:id`):
    - Search Published articles (`GET /knowledge/articles?q=`).
    - Link / unlink via Dev D link APIs (Admin/Agent).
    - List currently linked articles with navigate-to-slug.
  - Refresh on mutate (Socket optional — not required).

- **Day 24: Portal incident detail**
  - Add End User **portal** route for incident detail (gap from Phases 1–4).
  - Show status, key fields, comments (read rules as today), and linked KB articles **read-only**.
  - EndUser must not see Admin/Agent-only controls (assign, Problem link mutate, etc.).

- **Day 25: Walkthrough & RBAC**
  - Walkthrough: Agent links article → EndUser opens portal detail → sees article.
  - Assert EndUser cannot `POST`/`PATCH`/`DELETE` articles; Agent can link; unauthenticated → 401.
  - Fix edge cases; hand off to QA notes.

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| Knowledge article search + CRUD contract | Dev D | Day 22 stubs; Day 23 links |
| Ticket–article link APIs | Dev D | Admin/Agent mutate; list by ticket |
| Portal auth / roles | Dev D | Existing JWT + `@Roles` |

## Explicitly out of scope

- Admin KB authoring UI (Dev C)  
- End User KB browse/search shell (Dev B)  
- SLA rules table editor (Dev C)

---

## Checkpoint

See [checkpoint5.md](./checkpoint5.md) for Day 21–25 evidence mapping and the Agent → EndUser walkthrough.

**← Previous:** [Phase 4](./phase4.md)
