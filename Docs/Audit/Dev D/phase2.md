# Security Audit: Dev D (Phase 2)

Open mitigations from [phase2.md](../phase2.md). Own: events gateway hardening, observability, health, audit interceptor.

## Medium — Open

### [A05] WebSocket CORS from `process.env` at decorator time — `events.gateway.ts`

**Was:** `@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN } })` evaluated at import, not via validated `ConfigService` like `main.ts` HTTP CORS.

**Fix:** Drive Socket.IO CORS from the same `CORS_ORIGIN` after config load — e.g. custom `IoAdapter` in `main.ts` that reads `ConfigService`, or gateway options set after `NestFactory.create` / `app.useWebSocketAdapter`. Do not use `*`. Keep credentials aligned with HTTP CORS. Extend `events.gateway.spec.ts` / bootstrap check if useful.

Coordinate with Dev A if they touch `assertCanJoinTicketRoom` in the same file.

## Low / Hardening — Open

### [A09] Optional: audit failed mutating requests — `audit-log.interceptor.ts`

Success-only audit is fine as baseline. Optional: on mutating methods, persist a redacted row (or structured log) for selected 4xx (e.g. 400/409) with `action`, path, status — **no** request body secrets (reuse `redactAuditValue`). Skip 401/403 as today.

### [A05] Public `/health` exposes Redis / queue status — `health.controller.ts`

**Fix (pick one):**
1. Split liveness (`GET /health` → `{ status: "ok" }` only, `@Public`) vs readiness (`GET /health/ready` with DB/Redis, Admin or internal-network only), or
2. Keep combined check but gate dependency details behind auth / non-public path.

## Out of scope for Dev D
- Change approval bypass + migration rename → Dev B
- Dead `request-store` / EndUser room ownership → Dev A
