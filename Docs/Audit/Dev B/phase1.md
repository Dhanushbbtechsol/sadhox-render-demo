# Security Audit: Dev B (Phase 1)

Reaudit 2026-09-28: remediations below still hold. Access token and user are not persisted. Phase 1 closed. See [phase1.md](../phase1.md).

**Status:** Remediated (auth-store / login UI)

## Critical — Resolved
### [A07] Hardcoded mock credentials — apps/web/src/stores/auth-store.ts
**Was:** `MOCK_USERS` with shared `"password"` including Admin, always in the bundle.  
**Fix:** Mock users and `loginAsRole` are gated behind `import.meta.env.DEV`. Login UI does not prefill passwords; role presets are DEV-only.

### [A07] Broken auth fallback — apps/web/src/stores/auth-store.ts
**Was:** Remote login failure silently fell back to mock users in all builds.  
**Fix:** Mock fallback only in development. Production builds rethrow remote login errors with no local auth path.

## Medium — Resolved
### [A02] Plaintext passwords on the wire — apps/web/src/stores/auth-store.ts
**Was:** Password sent in JSON body without transport guarantees.  
**Fix:** `packages/env/src/web.ts` requires HTTPS for `VITE_SERVER_URL` in production (localhost HTTP allowed locally).

### [A02] Access token in localStorage — apps/web/src/stores/auth-store.ts
**Was:** Zustand persist wrote `accessToken`.  
**Fix:** `partialize` stores only `isAuthenticated`; user/token come back from the refresh cookie.
