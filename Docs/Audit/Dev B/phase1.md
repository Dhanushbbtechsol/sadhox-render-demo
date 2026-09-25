# Security Audit: Dev B (Phase 1)

## Critical
### [A07] Hardcoded mock credentials in production — apps/web/src/stores/auth-store.ts:8
The `MOCK_USERS` object hardcodes passwords (`"password"`) for three users, including an Admin user. 
Fix: Remove mock passwords from production builds. Use environment variables or rely exclusively on the remote API.

### [A07] Broken Auth Fallback — apps/web/src/stores/auth-store.ts:86
The `tryRemoteLogin` catches errors and silently falls back to the mock user authentication. If the backend is unreachable or an attacker blocks the request, they can log in locally as `admin@sadhox.local` using the hardcoded password.
Fix: Only allow fallback to mock users in explicit development mode (`import.meta.env.DEV`), never in production.

## Medium
### [A02] Plaintext passwords sent over wire — apps/web/src/stores/auth-store.ts:52
The login function sends passwords in plaintext. Ensure the production environment strictly enforces TLS/HTTPS for the backend.
