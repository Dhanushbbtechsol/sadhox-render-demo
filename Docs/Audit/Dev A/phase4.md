# Security Audit: Dev A (Phase 4)

Combined: [phase4.md](../phase4.md). Owner: incidents, sanitize, link-to-problem, portal/list UX.

## Phase 1 (do first)

### [A03] Medium — Comment sanitize bypass

`sanitizePlainText` only on `POST /incidents/:id/comments`. `CommentsService.create` stores raw `trim()`.

Fix: call `sanitizePlainText` in `CommentsService.create` (single choke point).

## Phase 2

### [A04] Medium — Link-to-problem lost-update

`link-to-problem.tsx` PATCHes full `linkedIncidentIds` from a stale client list; server replaces all links.

Fix: additive server endpoint; stop full-array replace from UI cache.

### [A03] Low — Other free-text writes

Reuse `sanitizePlainText` on resolution notes (and any other Dev-A free-text writes) for defense-in-depth.
