# Security Audit: Dev B (Phase 2)

**Reverified: 2026-09-29**  
**Result: CLEAN — open High/Medium items fixed**

Open mitigations from [phase2.md](../phase2.md). Own: changes / approvals / catalog / catalog migration.

## High — Fixed

### [A01 / A04] Agent can schedule a change without Admin approval — **FIXED**

**Files:** `changes.service.ts`, `approval-policy.ts`, `changes.controller.ts`

**Fix applied:**
- `CHANGE_ALLOWED_TRANSITIONS` no longer allows `Submitted` / `PendingApproval` → `Scheduled` (must `Approved` first).
- `requiresAdminForChangeStatus` gates `Approved` and `Scheduled` in `ChangesService.update`.
- Tests: `approval-policy.spec.ts`, `changes.service.spec.ts`, `changes.controller.spec.ts`.

## Medium — Fixed

### [A08] Rename catalog migration off `0001_` prefix — **FIXED**

Renamed to `0002_phase2_catalog_approvals.sql`; journal idx/tag updated. See `drizzle/migrations/RENAME_0002_NOTE.md` for shared-DB rename guidance.

## Optional follow-on (if Dev A deletes request-store)

If catalog must stay role-gated, add `allowedRoles` (or equivalent) to seed + `ServiceCatalogService.list` filter by JWT role. Current seed is all-role — no live hole until restricted items exist.

## Out of scope for Dev B
- WS CORS / health / audit interceptor → Dev D
- EndUser ticket-room ownership → Dev A
