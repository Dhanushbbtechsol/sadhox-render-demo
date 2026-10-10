# Security Audit: Dev B (Phase 9)

Audit 2026-10-09. Combined: [phase9.md](../phase9.md). **PASS / CLEAN.**

Service-request and change create forms do not send project or module. The approvals inbox is a client filter on lists the server already scopes: Manager rows are `reports_to_id = self`. Final approve stays on the Admin step of `/approve`.

Server `PATCH /changes/:id` org-chart gate ([A04] Dev D) is closed; this inbox stays a client filter on lists.
