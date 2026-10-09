# Security Audit: Dev B (Phase 9)

Audit 2026-10-09. Combined: [phase9.md](../phase9.md). **PASS / CLEAN.**

Service-request and change create forms do not send project or module. The approvals inbox is a client filter on lists the server already scopes: Manager rows are `reports_to_id = self`. Final approve stays on the Admin step of `/approve`.

The open Medium is `PATCH /changes/:id` on the server (Dev D), not this inbox.
