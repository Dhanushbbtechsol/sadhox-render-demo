# Dev C — Phase 5 QA (Frontend Only)

**Scope:** Admin Knowledge authoring, SLA rules table, dashboard CSV export.  
**Backend:** Dev D Knowledge + `/admin/sla-rules` APIs — use DEV mock token / offline fallback until those land.

---

## Smoke checklist

### Admin Knowledge (`/admin/knowledge`)

- [ ] Admin sees **Knowledge** in sidebar; Agent/EndUser do not.
- [ ] List loads (mock articles when APIs absent).
- [ ] Create category → appears in chip row and category filter.
- [ ] Create article as Draft → listed with Draft badge.
- [ ] Edit article → Publish → status **Published** (mock store updates in-session).
- [ ] Preview pane renders headings / lists / bold from markdown body.
- [ ] Delete article / category works in mock mode.

### SLA rules (`/admin/sla-rules`)

- [ ] Admin sees **SLA rules** in sidebar.
- [ ] Table shows P1–P4 with seed defaults (15/240, 60/480, 240/1440, 480/4320).
- [ ] Edit minutes → Save row → toast success (mock persistence).
- [ ] Invalid values (non-integer / resolve less than response) blocked client-side.

### Dashboard CSV (`/admin/dashboard`)

- [ ] **Export CSV** enabled when stats + SLA compliance loaded.
- [ ] File name `sadhox-dashboard-{range}-{date}.csv`.
- [ ] CSV includes KPIs, tickets-by-status/priority/module, SLA compliance for current range.

### Admin gating polish

- [ ] Dashboard, Assets, Knowledge, SLA rules, Audit logs, Queues remain Admin-only.
- [ ] Approvals remains Admin-only (unchanged).

---

## Live smoke (when Dev D APIs land)

1. Sign in as real Admin (not mock token).
2. Publish article via UI → confirm `GET /knowledge/articles` returns Published for Agent/EndUser (Dev B portal).
3. PATCH SLA rule → confirm Nest `sla_rules` row updated and new incidents use resolve minutes.
4. CSV still downloads from live aggregate endpoints.

---

## Explicitly out of scope (other tracks)

- End User KB browse shell — Dev B  
- Ticket ↔ article links — Dev A  
- Nest schema / KnowledgeModule / SLA Admin API — Dev D  
