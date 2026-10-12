# Security Audit: Dev A (Phase 9)

Reaudit remediation 2026-10-10. Combined: [phase9.md](../phase9.md). **PASS / CLEAN.**

EndUser may create a change and comment only on their own change. Schedule, implement, and close stay disabled.

## High — Resolved

### [A01 / A04] Change approve skips the creator's manager — **FIXED**

`ChangesService.approve`, `reject`, and the `PendingApproval` / `Approved` / `Rolled Back` branch of `update` call `resolveOrgApprovalActor` then `nextApproval`. Manager must be the creator’s `reports_to_id`. Admin cannot skip that manager on `Submitted`. Manager list/get are scoped to `reports_to_id` (no project fallback).
