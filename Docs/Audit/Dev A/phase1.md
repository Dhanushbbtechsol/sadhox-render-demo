# Security Audit: Dev A (Phase 1)

Reaudit 2026-09-28: see [phase1.md](../phase1.md).

## Low / Hardening
### [A07] Missing actual API integration — apps/web/src/lib/mocks/service-catalog.ts
**Status: Not fixed on the Nest start path.**

Frontend hooks (`use-service-catalog.ts`) call `/service-catalog` and `/service-requests`. Nest `ServiceRequestsController` is a GET stub with no ownership filter and no POST. The checks described below still live only on unused Hono `routes/catalog.ts`.

Intended remediations (Hono only, not `main.ts`):

- `GET /service-catalog` returns only items whose `allowedRoles` include the caller's role.
- `POST /service-requests` uses the JWT subject as requester and rejects a client-supplied requester id.
- `GET /service-requests` and `GET /service-requests/:id` scope EndUser to own rows.

Until those handlers are Nest controllers, treat this as open.
