# Dev C — Phase 5 QA (Frontend Only)

**Scope:** Admin Knowledge authoring, SLA rules table, dashboard CSV export.  
**Status:** Phase 5 **closed** on `Dev-C` (2026-10-07). Audit Medium remediations landed; Nest `/admin/sla-rules` available after Audit merge.

**Backend:** Dev D Knowledge + `/admin/sla-rules` — see [phase5-handoff.md](../Dev%20D/phase5-handoff.md). Offline mocks only via mock access token (`useOfflineAdminData()`).

---

## Smoke checklist

### Admin Knowledge (`/admin/knowledge`)

- [x] Admin sees **Knowledge** in sidebar; Agent/EndUser do not. *(code: `app-sidebar` Admin-only nav)*
- [x] List loads (live `{ data }` unwrap; mock articles only offline-token). *(hooks audit fix)*
- [x] Create category → appears in chip row and category filter. *(UI + mutations wired)*
- [x] Create article as Draft → listed with Draft badge. *(authoring page + status badge)*
- [x] Edit article → Publish → status **Published**. *(PATCH; fails loud if API error)*
- [x] Preview pane renders headings / lists / bold from markdown body. *(MarkdownPreview text nodes)*
- [x] Delete article / category works in mock mode. *(offline-token path)*

### SLA rules (`/admin/sla-rules`)

- [x] Admin sees **SLA rules** in sidebar.
- [x] Table shows P1–P4 with seed defaults (15/240, 60/480, 240/1440, 480/4320).
- [x] Edit minutes → Save row → toast success (live `PATCH`; mock only offline-token).
- [x] Invalid values (non-integer / resolve less than response) blocked client-side.

### Dashboard CSV (`/admin/dashboard`)

- [x] **Export CSV** enabled when stats + SLA compliance loaded.
- [x] File name `sadhox-dashboard-{range}-{date}.csv`.
- [x] CSV includes KPIs, tickets-by-status/priority/module, SLA compliance for current range.

### Admin gating polish

- [x] Dashboard, Assets, Knowledge, SLA rules, Audit logs, Queues remain Admin-only.
- [x] Approvals remains Admin-only (unchanged).

---

## Live smoke (human — when Nest + DB up)

1. Sign in as real Admin (not mock token).
2. Publish article via UI → confirm `GET /knowledge/articles` returns Published for Agent/EndUser (Dev B portal).
3. PATCH SLA rule → confirm Nest `sla_rules` row updated.
4. CSV still downloads from live aggregate endpoints.

---

## Explicitly out of scope (other tracks)

- End User KB browse shell — Dev B  
- Ticket ↔ article links — Dev A  
- Nest schema / KnowledgeModule / SLA Admin API — Dev D  
