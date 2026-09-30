# Security Audit: Dev D (Phase 2)

Reaudit 2026-09-29. Combined: [phase2.md](../phase2.md). **CLEAN.**

## Medium — Resolved

### [A05] WebSocket CORS — **FIXED (verified)**

`CorsIoAdapter` + `sharedCorsOptions` from ConfigService in `main.ts`.

## Low / Hardening — Resolved

### [A09] Failed mutating audit — **FIXED**

`audit-log.interceptor.ts` writes status-only rows for 400/409 (`POST /path -> 400`, `{ outcome, status }`); no request body. 401/403 still skipped.

### [A05] Public `/health` — **FIXED**

- `GET /health` — `@Public`, `{ status: "ok" }` only
- `GET /health/ready` — `@Roles("Admin")`, DB/Redis/queue details
