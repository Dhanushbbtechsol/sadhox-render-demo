     # Dev D — Phase 8: Two-step approval + report CSV

**Design:** [../phase8.md](../phase8.md)

- `ServiceRequestsService.approve` / `reject` and `ChangesService.approve` / reject: Manager moves `Submitted` → `PendingApproval`; Admin moves `PendingApproval` → `Approved`. No manager on the project → Admin approves `Submitted` directly.
- Admin approve/reject of `Submitted` when a manager exists → 403.
- `GET /admin/dashboard/report?range=` Admin, `text/csv`. Reuse the aggregate queries the dashboard already calls. One test: Manager cannot final-approve; Admin cannot skip the Manager step; report route 403 for Agent.
