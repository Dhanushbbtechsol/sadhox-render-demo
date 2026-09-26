# Security Audit: Dev A (Phase 1)

## Low / Hardening
### [A07] Missing actual API integration — apps/web/src/lib/mocks/service-catalog.ts
**Status: Fixed.**

The catalog and service-request screens no longer read or authorize from client mock data. Authenticated calls go to the API:

- `GET /service-catalog` returns only items whose `allowedRoles` include the caller's role. Production database access is limited to Admin and Agent.
- `POST /service-requests` requires an authenticated Admin, Agent, or EndUser. The requester is the JWT subject. A client-supplied requester id is rejected, and the server checks the catalog item's allowed roles before insert.
- `GET /service-requests` and `GET /service-requests/:id` return every request to Admin and Agent, and only the caller's own requests to an EndUser.
