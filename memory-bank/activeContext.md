# Active Context

**Current State:**
- The project has successfully merged Phase 1 development tracks (Dev A, B, C, D).
- The backend architecture was just migrated from Hono to **NestJS**.
- The frontend is using mock data and local mock authentication via Zustand.

**Next Immediate Steps:**
- Connect the frontend API client to the real NestJS backend.
- Replace the mock auth store (`auth-store.ts`) with real JWT/Supabase auth integration.
- Implement the database schema in `packages/db` using Drizzle ORM and run migrations.
