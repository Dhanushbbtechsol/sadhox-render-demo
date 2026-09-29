# Security Audit: Dev A (Phase 2)

Open mitigations from [phase2.md](../phase2.md). Own: incidents/problems + Phase 1 in-memory catalog leftovers.

## Low / Hardening — Resolved

### [A01] EndUser WS room join — `events.gateway.ts` `assertCanJoinTicketRoom`

**Status: Fixed.**  
After authenticate, Admin/Agent may join any `ticket:{id}` room. EndUser may join when the id is an incident with `reporterId === user.id` or a service request with `requesterId === user.id`. Unknown / other users' tickets remain default-deny.

### Dead Phase 1 catalog path — `request-store.ts` + `catalog.items.ts`

**Status: Fixed.**  
Deleted unused `request-store.ts`, `request-store.spec.ts`, `catalog.items.ts`, and `catalog.types.ts`. Live Nest path remains DB `service-catalog` / `service-requests`. Role-filtered catalog (`allowedRoles`) left as optional follow-on for Dev B if restricted items are seeded.

## Out of scope for Dev A
- Change approval bypass → Dev B
- WS CORS decorator → Dev D
- Migration rename `0001_phase2_catalog_*` → Dev B
- Audit interceptor / public health → Dev D
