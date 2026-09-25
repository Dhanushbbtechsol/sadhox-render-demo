# Dev C — Phase 1: Foundation, Admin Shell & Stubs (Week 1 / Days 1–5)

**Goal:** Scaffold Admin layout and Asset register views, wire authentication context with Dev D, and stub metrics against Swagger.

---

- **Day 1: Admin Shell & Visualization Setup**
  - Scaffold Admin routes: `/admin/dashboard`, `/assets`, `/admin/audit-logs`.
  - Install and configure charting library (`recharts` integrated with shadcn/ui chart components).
  - Setup core KPI card components with metric trend indicators.

- **Day 2: Admin Authentication Guarding**
  - Connect with Dev D's auth context.
  - Build frontend `AdminRoute` wrapper preventing non-Admin users (`EndUser`, `Agent`) from viewing admin routes and redirecting them to their respective home queues.

- **Day 3: Swagger Stubs & Mock Data Hooks**
  - Consume Dev D's OpenAPI schema for Assets and Admin endpoints.
  - Setup React Query hooks: `useAssets()`, `useAdminStats()`, `useAuditLogs()`.
  - Mock aggregation data for ticket counts by status, priority, and module.

- **Day 4: Asset Register Table UI Design**
  - Build responsive asset inventory table with shadcn/ui:
    - Columns: Asset Tag, Asset Name, Category (`Hardware`, `Software`, `Network`), Assigned Owner, Status, Linked Tickets count, and Action menu.
    - Quick search bar, category filters, and status filters.

- **Day 5: Staging Auth Integration Verification (Checkpoint 1)**
  - Verify that only Admin user credentials can access `/admin/*` on Dev D's staging backend.
  - **✅ Checkpoint 1:** Role gating blocks non-admins; asset table renders mock records smoothly.

---

**Next →** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase2.md)
