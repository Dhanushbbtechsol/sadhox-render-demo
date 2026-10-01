# Security Audit: Dev B (Phase 4)

Reaudit 2026-10-01. Combined: [phase4.md](../phase4.md). **CLEAN.**

## Medium — Resolved

### [A04] Reject reason unbounded — **FIXED (verified)**

`RejectServiceRequestDto.reason` `@MaxLength(4000)`; write path `sanitizePlainText`.

### [A01 / A04] Agent can reject via `Rolled Back` — **FIXED (verified)**

`CHANGE_ADMIN_GATED_STATUSES` includes `Rolled Back`. Specs: `approval-policy.spec.ts`, `changes.service.spec.ts`, `changes.controller.spec.ts`.

## Low — Resolved

### [A03] Sanitize reject / fulfill + email subjects — **FIXED (verified)**

Reject/fulfill sanitized; email subjects use `sanitizeEmailSubjectPart`.
