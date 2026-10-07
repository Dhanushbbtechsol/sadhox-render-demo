# Security Audit: Dev D (Phase 6)

Reaudit 2026-10-07 (post merge). Combined: [phase6.md](../phase6.md). **PASS / CLEAN** (Phase 6).

## Verified closed (Phase 6)

| Finding | Evidence |
| --- | --- |
| Assignment agents IDOR | `assertCanAccess` in `listAgents`; `assignment.phase6.spec.ts` |
| EndUser project list managers | picker `{ id, name }` only |
| EndUser module list | existence + picker fields |
| Resource ACL tests | `manager-project-acl.matrix.spec.ts` + Assignment in matrix |

## Phase 4 carryovers (still open — not Phase 6)

- Medium: CSRF on `SameSite=None` refresh cookie
- Low: prod throttle ceiling; `/auth/logout` throttle; WS auth → Sentry skip
