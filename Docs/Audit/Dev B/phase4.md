# Security Audit: Dev B (Phase 4)

Reaudit after remediations. Combined: [phase4.md](../phase4.md). **CLEAN.**

Owner: approvals, changes, mail, reject dialogs.

## Medium — Resolved

### [A04] Reject reason unbounded — **FIXED**

`RejectServiceRequestDto.reason` now `@MaxLength(4000)` (same as fulfill notes). Write path uses `sanitizePlainText`.

### [A01 / A04] Agent can reject changes via `Rolled Back` — **FIXED**

`CHANGE_ADMIN_GATED_STATUSES` includes `Rolled Back`. Agent `PATCH` → `Rolled Back` → 403; Admin only (matches approval inbox). Specs: `approval-policy.spec.ts`, `changes.service.spec.ts`, `changes.controller.spec.ts`.

## Low — Resolved

### [A03] Sanitize reject / fulfill notes + email subjects — **FIXED**

- Reject reason / fulfill notes sanitized via `sanitizePlainText` at write.
- Email subjects use `sanitizeEmailSubjectPart` (strip CR/LF) in `email.processor.ts`.
