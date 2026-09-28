# Security Audit: Dev A (Phase 1)

Reaudit 2026-09-28: catalog/request RBAC is on Nest `main.ts`. See [phase1.md](../phase1.md).

## Low / Hardening
### [A07] Missing actual API integration — previously apps/web/src/lib/mocks/service-catalog.ts
**Status: Fixed on the Nest start path.**

- `GET /service-catalog` filters by `allowedRoles`.
- `POST /service-requests` uses the JWT subject; `RejectRequesterOverridePipe` rejects client `requesterId` / `requesterName`.
- List/get scope EndUser to own rows (`request-store`).
