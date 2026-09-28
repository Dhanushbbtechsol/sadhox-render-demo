# Security Audit: Dev B (Phase 1)

Reaudit 2026-09-28: remediations below still hold. New Phase 1 issues are in [phase1.md](../phase1.md) (token persistence, leftover Hono auth).

**Status:** Remediated (auth-store / login UI)

## Critical — Resolved
### [A07] Hardcoded mock credentials — apps/web/src/stores/auth-store.ts
**Was:** `MOCK_USERS` with shared `"password"` including Admin, always in the bundle.  
**Fix:** Mock users and `loginAsRole` are gated behind `import.meta.env.DEV`. Login UI no longer advertises or prefills passwords; role presets are DEV-only.

### [A07] Broken auth fallback — apps/web/src/stores/auth-store.ts
**Was:** Remote login failure silently fell back to mock users in all builds.  
**Fix:** Mock fallback only in development. Production builds rethrow remote login errors with no local auth path.

## Medium — Resolved
### [A02] Plaintext passwords on the wire — apps/web/src/stores/auth-store.ts
**Was:** Password sent in JSON body without transport guarantees.  
**Fix:** `packages/env/src/web.ts` requires HTTPS for `VITE_SERVER_URL` in production (localhost HTTP allowed locally).
