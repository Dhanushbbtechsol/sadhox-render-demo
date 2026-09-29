# Security Audit: Dev B (Phase 2)

Open mitigations from [phase2.md](../phase2.md). Own: changes / approvals / catalog / catalog migration.

## High — Open

### [A01 / A04] Agent can schedule a change without Admin approval

**Files:** `apps/server/src/changes/changes.service.ts`, `apps/server/src/common/approval-policy.ts`, `apps/server/src/changes/changes.controller.ts`

**Was:** `POST /changes` creates `Submitted`. Agents may `PATCH /changes/:id` with `status: "Scheduled"` because only `Approved` is Admin-gated and `CHANGE_ALLOWED_TRANSITIONS` allows `Submitted → Scheduled`.

**Fix (pick one, implement fully):**
1. **Preferred:** In `ChangesService.update`, require Admin for transitions into `Approved` **and** `Scheduled` (and any CAB gate you treat as approval). Agents may still update fields and post-implement statuses (e.g. `Implemented` → `Closed`) if product allows.
2. Or split Agent `PATCH` to field-only + limited statuses (`Draft`/`Submitted`); leave `PATCH /changes/:id/approve` and schedule transitions Admin-only.
3. Update `approval-policy.spec.ts` / any change controller tests so Agent→Scheduled fails and Admin→Scheduled (after Submitted) succeeds.

Do not leave a second path that reopens the skip.

## Medium — Open

### [A08] Rename catalog migration off `0001_` prefix

**Files:** `apps/server/drizzle/migrations/0001_phase2_catalog_approvals.sql`, `apps/server/drizzle/migrations/meta/_journal.json`

**Fix:** Rename file to `0002_phase2_catalog_approvals.sql` (or next free index). Update journal `tag` / `idx` so order stays: `0000` → incidents/problems `0001` → catalog `0002`. Coordinate with anyone who already applied the old filename on a shared DB (record rename in a short note if needed).

## Optional follow-on (if Dev A deletes request-store)

If catalog must stay role-gated, add `allowedRoles` (or equivalent) to seed + `ServiceCatalogService.list` filter by JWT role. Current seed is all-role — no live hole until restricted items exist.

## Out of scope for Dev B
- WS CORS / health / audit interceptor → Dev D
- EndUser ticket-room ownership → Dev A
