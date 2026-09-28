# Security Audit: Dev C (Phase 1)

Reaudit 2026-09-28: UI gates remain client-side (expected). Nest now enforces matching roles on stubs. See [phase1.md](../phase1.md).

## Medium
### [A01] Client-side Authorization Checks — apps/web/src/router.tsx
**Status: API remediations in place.** `ProtectedRoute` still hides admin UI in the browser. Bypass does not reach data: `GET /assets` is `@Roles("Admin")`; incidents/problems are Admin/Agent; catalog/requests use JWT + `request-store`.

Keep the client gate for UX. Do not treat UI hiding as the control.
