# Dev C — Phase 5: Admin Knowledge Authoring, SLA Table & CSV Export (Week 5 / Days 21–25)

**Status:** **Complete** on `Dev-C` (2026-10-07). QA: [phase5-qa.md](./phase5-qa.md). Audit: [Docs/Audit/Dev C/phase5.md](../../Audit/Dev%20C/phase5.md).

**Goal:** Admin Knowledge Base authoring UI; simple SLA rules table editor; dashboard CSV export for current aggregates.

**Context:** Phases 1–4 remain historical. Coverage: [coverage-matrix.md](../coverage-matrix.md). Backend contract: [Dev D Phase 5](../Dev%20D/phase5.md) / [handoff](../Dev%20D/phase5-handoff.md).

---

- **Day 21–23: Admin Knowledge authoring**
  - Routes under Admin shell: `/admin/knowledge` (list), create/edit article, manage categories.
  - Support Draft / Published, preview, markdown or plain body (match Dev D schema).
  - Strict Admin-only gating (reuse existing Admin route patterns).
  - Sidebar / nav entry for Knowledge management.

- **Day 24: SLA rules table editor**
  - Admin UI listing `sla_rules` by priority with editable `responseMinutes` / `resolveMinutes`.
  - Wire to Dev D Admin SLA rules `GET` / `PATCH`.
  - **Not** a drag-and-drop policy builder (PRD OOS).

- **Day 25: Dashboard CSV export & polish**
  - Export current date-range dashboard aggregates (stats / tickets-by-status / SLA compliance) as CSV download.
  - Polish nav labels; confirm Audit/Queues/Assets still Admin-only.
  - Smoke: Admin publishes article → appears in Dev B portal search.

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| Knowledge Admin write APIs | Dev D | Day 22 |
| SLA rules Admin API | Dev D | Day 23 |
| Existing dashboard aggregate endpoints | Dev C Phase 2–3 / Dev D | CSV built client-side or thin export endpoint |

## Explicitly out of scope

- End User KB browse shell — Dev B  
- Ticket link panel on incidents — Dev A  
- Custom report builder / BI — PRD OOS  
- Drag-and-drop SLA builder — PRD OOS  

**← Previous:** [Phase 4](./phase4.md)
