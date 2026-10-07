# Security Audit: Dev A (Phase 6)

Combined: [phase6.md](../phase6.md). Owner: Incidents/Problems project scoping + assignment UI pool.

## Phase 1 (do first)

### [A01] High — Problems assignee ignores project pool

`problems.service.ts` create/update only `assertUserExists(assignedTo)`. Incidents correctly use `assertAssigneeInPool` / `AssignmentService.isInPool`.

**Fix:** same pool check as incidents when `projectId` is set.

## Spot-checked (clean)

- Incident create/update: `resolveTicketProjectFields` + `assertCanAccess` for non-EndUser
- Incident assignee: `assertAssigneeInPool`
- List/get: `ticketProjectScope` / `assertCanViewTicket`
- Manager on incident `@Roles` + server ACL
