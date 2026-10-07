# Dev B — Phase 6: Project-Scoped Requests & Changes + Manager Approvals

**Goal:** Add project/module to Service Requests & Changes; approvals allow **Admin or Manager** (single-level) with project ownership for Managers.  
**Prerequisite:** Dev D approval ACL + OpenAPI. **Do not rebuild KB.**  
**Design:** [../phase6.md](../phase6.md)

---

- **Day 26–27:** Forms/hooks: `project_id` + `module_id` on request/change create; catalog submit path accepts optional project when provided by API.
- **Day 28:** Approval inbox — Manager sees/approves only own-project items; Admin sees all (incl. null project). Keep state machine single-level.
- **Day 29:** Lists scoped; Agent fulfillment still only after Approved; Agent visibility limited to member projects.
- **Day 30:** Walkthrough + QA notes.
