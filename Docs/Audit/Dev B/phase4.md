# Security Audit: Dev B (Phase 4)

Combined: [phase4.md](../phase4.md). Owner: approvals, changes, mail, reject dialogs.

## Phase 1 (do first)

### [A04] Medium — Reject reason unbounded

`RejectServiceRequestDto.reason` — `@MinLength(1)` only; fulfill notes already capped at 4000.

Fix: `@MaxLength(4000)` (+ optional `sanitizePlainText`).

### [A01 / A04] Medium — Agent can reject changes via `Rolled Back`

`CHANGE_ADMIN_GATED_STATUSES` = `Approved`/`Scheduled` only. Agent `PATCH` → `Rolled Back` from `Submitted` notifies creator as rejected.

Fix: Admin-gate rejection path (status set or dedicated `/reject`).

## Phase 2

### [A03] Low — Sanitize reject / fulfill notes

Reuse `sanitizePlainText` at write; strip CR/LF from email subjects that interpolate titles.
