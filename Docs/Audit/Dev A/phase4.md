# Security Audit: Dev A (Phase 4)

Combined: [phase4.md](../phase4.md). Owner: incidents, sanitize, link-to-problem, portal/list UX.

## Phase 1 — Resolved

### [A03] Medium — Comment sanitize bypass — **FIXED**

`CommentsService.create` now calls `sanitizePlainText` (same helper as incident comments) and rejects empty post-sanitize content.

## Phase 2 — Resolved

### [A04] Medium — Link-to-problem lost-update — **FIXED**

Additive `POST /problems/:id/incidents/:incidentId` inserts one link without replacing the set. `link-to-problem.tsx` uses that endpoint (no client-cached full-array PATCH).

### [A03] Low — Other free-text writes — **FIXED**

`IncidentsService.update` runs `sanitizePlainText` on resolution notes at write.
