# Security Audit: Dev D (Phase 1)

## High
### [A01] Missing Global Authorization Guard — apps/server/src/app.controller.ts
The NestJS API scaffold was just generated but does not yet implement a global JWT Auth Guard or RBAC interceptors. Endpoints added here are public by default.
Fix: Implement Supabase Auth / Passport-JWT integration before adding business logic endpoints.

## Low / Hardening
### [A05] Database Connection String — packages/db/.env
Ensure the `postgresql://` connection string is strictly loaded from a secure `.env` file or secrets manager, and never committed to source control.
