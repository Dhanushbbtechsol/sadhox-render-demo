# Security Audit: Dev A (Phase 9)

Reaudit 2026-10-10 at `aee9684` (Dev A `4db2d05` merged). Combined: [phase9.md](../phase9.md). **FAIL.**

`4db2d05` ("Add EndUser change requests; disable actions") is the current Dev A delta. EndUser may create a change and comment only on their own change. Schedule, implement, and close stay disabled.

## High — Open

### [A01 / A04] Change approve skips the creator's manager

`ChangesService.approve`, `reject`, and the Approved / Rolled Back branch of `update` call `assertCanApprove` and write `Approved` or `RolledBack` directly (`apps/server/src/changes/changes.service.ts`). An Admin, or the manager of the change's project, can final-approve Submitted, Draft, or PendingApproval. Phase 9 requires `reports_to_id` first, then Admin. `nextApproval` is not used.

**Fix:** Resolve the creator's `reports_to_id` and call `nextApproval`, the same way service requests do. A project manager who is not that person gets 403. Admin on Submitted gets 403 when that manager exists.

Incident create again sends `projectId` / `moduleId`. That is a Phase 9 form regression. The server already accepted those fields for EndUser after an existence check, so it is not a second finding.
