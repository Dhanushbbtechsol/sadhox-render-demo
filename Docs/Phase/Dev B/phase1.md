# Dev B — Phase 1: Foundation, Catalog Layout & Stubs (Week 1 / Days 1–5)

**Goal:** Scaffold Service Catalog and Change UI layouts, integrate Auth context with Dev D, and stub hooks against Swagger.

---

- **Day 1: Component Scaffold & Navigation**
  - Scaffold Service Catalog and Change Management routes in React (`/catalog`, `/requests`, `/changes`).
  - Setup UI components from shadcn/ui: Dialog, Tabs, Select, Badge, Table, Calendar picker.

- **Day 2: Auth & Role Integration**
  - Connect with Dev D's authentication context.
  - Build route permission guards:
    - `/catalog`: accessible to all authenticated users (`EndUser`, `Agent`, `Admin`).
    - `/changes`: restricted to `Agent` and `Admin`.
    - Approval buttons: visible only to `Admin`.

- **Day 3: Swagger Stubs & Data Contracts**
  - Consume Dev D's OpenAPI schema for Service Requests and Changes.
  - Setup React Query hooks: `useServiceCatalog()`, `useServiceRequests()`, `useChanges()`.
  - Stub mock request items (e.g. "Request Laptop", "VPN Access", "Database Access").

- **Day 4: Catalog Browsing & Request Modal UI**
  - Build Service Catalog grid layout displaying available services categorized by department.
  - Create dynamic request form modal with custom fields per request type (e.g., Justification, Urgency).

- **Day 5: Staging Auth Integration Verification (Checkpoint 1)**
  - Validate role-based navigation against Dev D's staging backend.
  - **✅ Checkpoint 1:** User can log in as EndUser, browse catalog stubs, and view permission-restricted UI appropriately.

---

**Next →** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20B/phase2.md)
