# Security Audit: Dev A (Phase 1)

Reaudit 2026-09-28: see [phase1.md](../phase1.md).
Remediation follow-up: Nest catalog/request RBAC landed on the `main.ts` start path.

## Low / Hardening
### [A07] Missing actual API integration — previously apps/web/src/lib/mocks/service-catalog.ts
**Status: Fixed on the Nest start path.**

Frontend hooks (`use-service-catalog.ts`) call `/service-catalog` and `/service-requests` (client mock catalog removed). Nest serves those routes:

- `GET /service-catalog` (`ServiceCatalogController`) returns only items whose `allowedRoles` include the caller's role.
- `POST /service-requests` uses the JWT subject as requester; `RejectRequesterOverridePipe` + `forbidNonWhitelisted` reject a client-supplied `requesterId` / `requesterName`.
- `GET /service-requests` and `GET /service-requests/:id` scope EndUser to own rows via `request-store` ownership checks.

Evidence: `apps/server/src/service-requests/request-store.spec.ts`.
