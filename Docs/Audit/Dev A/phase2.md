# Security Audit: Dev A (Phase 2)

Open mitigations from [phase2.md](../phase2.md). Own: incidents/problems + Phase 1 in-memory catalog leftovers.

## Low / Hardening — Open

### [A01] EndUser WS room join (product gap) — `events.gateway.ts` `assertCanJoinTicketRoom`

**Status: Open (Phase 3-ready, can land now if ownership is cheap).**  
EndUsers may create comments on own incidents but cannot `join` `ticket:{id}` rooms (blanket Admin/Agent only).

**Fix:** After authenticate, allow join when `user.role` is EndUser **and** the ticket exists with `reporterId === user.id` (incident) — or equivalent for service requests. Keep default-deny for unknown / other users' tickets. Coordinate with Dev D if WS CORS / gateway factory changes land first.

### Dead Phase 1 catalog path — `request-store.ts` + `catalog.items.ts`

**Status: Open.**  
Live Nest path uses DB `service-catalog` / `service-requests` (Dev B). In-memory `request-store` + `allowedRoles` catalog are unused and confuse RBAC ownership.

**Fix:** Delete `request-store.ts`, `request-store.spec.ts`, and `catalog.items.ts` / `catalog.types.ts` if nothing imports them; drop related tests. Do **not** reintroduce in-memory catalog. If role-filtered catalog is still required, add `allowedRoles` on DB seed and filter in `ServiceCatalogService.list` (hand off to Dev B).

## Out of scope for Dev A
- Change approval bypass → Dev B
- WS CORS decorator → Dev D
- Migration rename `0001_phase2_catalog_*` → Dev B
- Audit interceptor / public health → Dev D
