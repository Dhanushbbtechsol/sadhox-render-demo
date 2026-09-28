# Security Audit: Dev C (Phase 1)

Reaudit 2026-09-28: still open. Admin pages are not on `router.tsx`; `ProtectedRoute` is client-only. See [phase1.md](../phase1.md).

## Medium
### [A01] Client-side Authorization Checks — apps/web/src/router.tsx:33
The `RequireRoles` component performs role checking on the client side. While necessary for UI state, ensure that the API endpoints these admin pages interact with also rigorously enforce role-based access control (RBAC). Client-side checks can be bypassed by manipulating the frontend state.
Fix: Do not expose sensitive data endpoints to non-admins on the NestJS backend.
