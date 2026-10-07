# Dev A — Phase 6: Project-Scoped Incidents & Problems

**Goal:** Wire `project_id` / `module_id` on Incidents & Problems; lists respect ProjectAccess; assignment UI uses project member pool.  
**Prerequisite:** Dev D contract Days 26–28. **Do not rebuild KB** — only reuse existing ticket↔article UI.  
**Design:** [../phase6.md](../phase6.md)

---

- **Day 26–27:** Types/hooks for project + module; create/edit forms pick project then module (module must belong to project).
- **Day 28:** List/detail filtered by API (Manager/Agent scope). Round-robin + manual assignee pickers use project members when project set; show global pool only for null-project tickets (Admin).
- **Day 29:** RBAC walkthrough — Manager sees own project tickets only; Agent only member projects; EndUser unchanged.
- **Day 30:** Fix edge cases; hand QA notes.
