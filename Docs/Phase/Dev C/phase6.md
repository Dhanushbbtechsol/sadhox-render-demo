# Dev C — Phase 6: Projects Admin UI & Manager-Scoped Admin Views

**Goal:** Admin UI for projects / members / modules; Manager navigation + dashboard filters scoped to owned projects. Close remaining Phase 5 Admin hook/mock gaps if not already done **before** starting this work.  
**Design:** [../phase6.md](../phase6.md)

---

- **Day 26 (gate):** Confirm SLA rules API live + Knowledge Admin hooks unwrap `{ data }` / no silent mock writes.
- **Day 27–28:** Admin `/admin/projects` CRUD (name, assign Manager, members = Agents only, modules). Block adding Manager role users to members in UI (server also rejects).
- **Day 29:** Manager role routes — home / dashboard charts filtered to owned projects (use API filters, not client-only hide).
- **Day 30:** Walkthrough Admin + Manager; QA notes.
