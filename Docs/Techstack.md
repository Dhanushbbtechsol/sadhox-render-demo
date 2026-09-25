### 1. Frontend
* **Framework:** React (Vite)
* **Styling/Components:** Tailwind CSS + shadcn/ui
* **State/Data Fetching:** React Query + Zustand
* **Routing:** React Router

### 2. Backend (Custom)
* **Framework:** Node.js + NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM/Migrations:** Drizzle ORM + drizzle-kit
* **Auth:** Passport.js (JWT strategy, refresh tokens), bcrypt for password hashing
* **Authorization:** Custom RBAC guards/decorators (Admin, Agent, EndUser) — replaces Supabase RLS
* **Realtime:** Socket.io (Nest WebSocket gateway) for comment/activity feeds
* **Background Jobs/Cron:** BullMQ + Redis (SLA breach checks, auto-close, email dispatch)
* **Validation:** class-validator / class-transformer on all DTOs
* **API Docs:** Swagger (OpenAPI) via @nestjs/swagger

### 3. Infrastructure & Deployment
* **Frontend Hosting:** Vercel
* **Backend + DB + Redis Hosting:** Railway (or Render)
* **CI/CD:** GitHub Actions (lint, test, build, deploy on merge to main)
* **Secrets Management:** Platform env vars (Railway/Render secrets)

### 4. Third-Party Services
* **Transactional Email:** Resend (called from Nest service, not Edge Functions)

### 5. Quality & Observability (new — required for production)
* **Testing:** Jest (unit) + Supertest (e2e API tests)
* **Error Monitoring:** Sentry
* **Logging:** Pino (structured logs)
* **Rate Limiting:** @nestjs/throttler