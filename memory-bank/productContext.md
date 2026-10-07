# Product Context

Sadhox replaces fragmented IT ops with a single ITSM surface:

| Role | Persona | Needs |
|------|---------|--------|
| **EndUser** | Eve | Report incidents, browse catalog/KB, submit requests, track status |
| **Agent** | Alice | Work tickets (“Employee” in product talk = Agent); visibility limited to `project_members` projects (Phase 6) |
| **Manager** | *(Phase 6)* | Owns projects via `projects.manager_id`; sees/approves only those projects; does **not** work tickets as a member |
| **Admin** | Ian | Global: users, projects, org settings, assets, KPIs, catalog & KB authoring |

## Six confirmed product requirements
1. Incident Management (lifecycle, priority matrix, assignment, comments, problems)
2. Service Catalog (browse, request, approve, fulfill; Admin catalog CRUD in Phase 5)
3. SLA Management (rules, `sla_due_at`, BullMQ breach + auto-close; Admin table editor UI — API gap noted in STATUS)
4. Asset Management (CRUD, ticket links, Admin-only finance fields)
5. Knowledge Base (categories, articles Draft/Published, search, ticket links) — Phase 5
6. Reports & Dashboards (Admin aggregates + CSV export; no custom BI builder)

## Explicitly out of scope
Multi-tenant billing, enterprise SSO/SAML, drag-and-drop SLA builder, advanced BI report builders, native mobile, CMDB dependency graphs, multi-level approval chains.
