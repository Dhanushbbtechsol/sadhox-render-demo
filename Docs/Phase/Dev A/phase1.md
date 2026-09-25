# Dev A — Phase 1: Foundation, UI Shell & Stubs (Week 1 / Days 1–5)

**Goal:** Scaffold React UI shell, wire authentication context with Dev D's API, and stub Incident/Problem components against Swagger.

---

- **Day 1: Frontend Scaffold & Navigation**
  - Scaffold React + Vite application shell with Tailwind CSS and shadcn/ui.
  - Setup core layout: App Sidebar, Top Navbar with User Profile, and Breadcrumb navigation.
  - Setup React Router with protected route wrappers (`/incidents`, `/problems`).

- **Day 2: Authentication Context Integration**
  - Consume Dev D's `/auth/login`, `/auth/refresh`, and `/auth/logout` endpoints.
  - Implement Zustand auth store managing current user session and role (`Admin`, `Agent`, `EndUser`).
  - Verify automatic token refresh handling on 401 response via Axios/Fetch interceptor.

- **Day 3: Swagger Stubs & API Client Hooks**
  - Import Dev D's OpenAPI types for Incidents and Problems.
  - Setup React Query hooks with mock data: `useIncidents()`, `useIncident(id)`, `useProblems()`.
  - Design empty-state and loading-skeleton components for ticket lists.

- **Day 4: Incident Creation Form & Validation**
  - Build ticket creation modal/page using `react-hook-form` and `zod`.
  - Fields: Title, Description, Impact (`Low`, `Medium`, `High`), Urgency (`Low`, `Medium`, `High`), Category.
  - Interactive priority preview: real-time badge calculating P1–P4 as user toggles impact and urgency.

- **Day 5: Staging Auth & Navigation Verification (Checkpoint 1)**
  - Integrate with Dev D's staging backend: verify login redirects to Incident queue for Agents and End-User portal for EndUsers.
  - **✅ Checkpoint 1:** End-to-end auth works; protected routes enforce role checks.

---

**Next →** [Phase 2](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20A/phase2.md)
