# Security Audit: Dev D (Phase 6)

Reaudit 2026-10-07 (post latest merge). Combined: [phase6.md](../phase6.md). **PASS** (Phase 6 High/Medium clean).

## Verified closed (Phase 6)

| Finding | Evidence |
| --- | --- |
| Assignment agents IDOR | `assertCanAccess` in `listAgents` |
| EndUser project/module redact | picker DTOs |
| Resource ACL tests | `manager-project-acl.matrix.spec.ts` |
| Admin users API | `@Roles("Admin")`; bcrypt 12; no hash in responses |

## Low — Closed

### [A05] Local seed default `ChangeMe123!` — closed (Phase 7 close-out)

`seed.ts` generates a one-time password when `SEED_PASSWORD` is unset (stdout only; no disk). Re-run does not reset existing user hashes.

## Phase 4 carryovers (still open)

- Medium: CSRF on `SameSite=None` refresh — **FIXED** (2026-10-08; Origin allowlist)
- Low: throttle ceiling; logout throttle; WS Sentry skip
