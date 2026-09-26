# Security Audit: Dev D (Phase 1)

## High

### [A01] Missing Global Authorization Guard — apps/server/src/app.controller.ts

**Status: FIXED**

There is no `app.controller.ts`. Nest is the only API entry (`src/main.ts`).

Global auth (deny-by-default) in [`apps/server/src/app.module.ts`](../../apps/server/src/app.module.ts):

- `JwtAuthGuard` (Passport-JWT) as `APP_GUARD` — Bearer required unless `@Public()`
- `RolesGuard` as `APP_GUARD` — `@Roles('Admin'|'Agent'|'EndUser')` enforced

`@Public()` only on: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /health`.

Phase 1 uses Passport JWT (not Supabase Auth), per Dev D phase docs.
Auth implementation: `apps/server/src/auth/` (`AuthModule`, `JwtStrategy`, refresh rotation).

**Also removed:** temporary Hono entry (`src/index.ts`) and demo `src/routes/auth.ts`
that bypassed Nest guards with hardcoded demo passwords.

## Low / Hardening

### [A05] Database Connection String — packages/db/.env

**Status: FIXED** (note: there is no `packages/db` package)

`DATABASE_URL` is loaded only from env via Nest `ConfigModule` + Zod
(`apps/server/src/config/validate-env.ts` → `DatabaseModule`). Not hardcoded in app code.

Hardening:

- Root [`.gitignore`](../../.gitignore): `.env` / `.env.*` (allows `.env.example` only)
- `apps/server/.gitignore`: `.env*`
- Template: [`apps/server/.env.example`](../../apps/server/.env.example) (placeholders only; port `5436`)
- Runtime secrets: local gitignored `apps/server/.env`, or Render `DATABASE_URL` from managed DB
- Removed tracked credentials scratch file `cred.md` from the git index and added it to `.gitignore`
