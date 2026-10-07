# sadhox

Context for AI assistants. **Canonical status handoff:** [`Docs/STATUS.md`](./Docs/STATUS.md). **Memory bank:** [`memory-bank/`](./memory-bank/).

## Project Overview

- **Product:** ITSM (Incidents, Problems, Catalog/Requests, Changes, Assets, Knowledge, Admin)
- **Ecosystem:** TypeScript
- **Package Manager:** pnpm
- **Integration branch:** `Audit`

## Tech Stack (runtime)

- **Runtime:** node
- **Frontend:** react-vite, tailwind, shadcn-ui, zustand, react-query — `apps/web`
- **Backend:** NestJS — `apps/server` (not Hono in practice)
- **Database:** postgres + Drizzle schema in `apps/server/src/database/schema/`
- **Authentication:** Passport JWT + refresh cookies (not supabase-auth in practice)
- **Realtime / jobs / email:** Socket.io, BullMQ+Redis, Resend

## Project Structure

```
sadhox/
├── apps/
│   ├── web/         # React SPA
│   └── server/      # NestJS API + Drizzle
├── packages/        # config/env (scaffold auth/db packages unused)
├── Docs/            # PRD, FRD, Workflow, Phase, Audit, STATUS.md
└── memory-bank/
```

## Common Commands

- `pnpm install` — Install dependencies
- `pnpm dev` — Start development server
- `pnpm build` — Build for production
- Prefer `apps/server` scripts for schema/migrations when changing DB

## Better Fullstack project context

`bts.jsonc` is the authority for the **generator** Stack Graph (role selection / `ownerPartId`). It still lists Hono + Supabase Auth — that reflects the original scaffold, **not** the current NestJS + Passport JWT application. Do not use `bts.jsonc` labels as the source of truth for how auth or the API work today. Top-level option fields are a compatibility projection and must not become a second mutation path for product code.

### Stack Parts, ownership, and evidence (generator record)

- `backend.auth:typescript:supabase-auth`. It belongs to `backend:typescript:hono`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.email:typescript:resend`. It belongs to `backend:typescript:hono`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend.runtime:typescript:node`. It belongs to `backend:typescript:hono`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `backend:typescript:hono`. Its generated target is `apps/server`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `database.dbSetup:universal:supabase`. It belongs to `database:universal:postgres`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `database:universal:postgres`. Its generated target is `packages/db`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.css:typescript:tailwind`. It belongs to `frontend:typescript:react-vite`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.deploy:typescript:vercel`. It belongs to `frontend:typescript:react-vite`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.stateManagement:typescript:zustand`. It belongs to `frontend:typescript:react-vite`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend.ui:typescript:shadcn-ui`. It belongs to `frontend:typescript:react-vite`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.
- `frontend:typescript:react-vite`. Its generated target is `apps/web`. Evidence is `listed` with `unverified` freshness. Verification maintainer: @Marve10s.

### Installed-version authority

Use `bts.jsonc` for the generator and schema version. Use local package manifests and lockfiles for installed dependency versions. Do not assume that documentation for a newer Better Fullstack release matches this project.

### Compatibility and lifecycle safety

Run `create-better-fullstack context --json` for bounded roles, capabilities, evidence, compatibility issues, and safe next actions. Run `create-better-fullstack doctor --json` before repairing graph drift. Existing-project writes must start with a plan and use the exact review token. Use `create-better-fullstack recipes check --json` before editing recipe-owned paths or managed regions, and use recipe history plus project recovery commands to undo a reviewed operation.

User code outside an explicit Better Fullstack managed region is not generator-owned. Missing or changed managed-region hashes stop recipe planning for manual review.

<!-- <better-fullstack:recipes sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855> -->

<!-- </better-fullstack:recipes> -->

## Maintenance

Keep AGENTS.md and `Docs/STATUS.md` updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.

## Learned User Preferences

- Use merge-to-audit for combining selected Dev branches into `audit`/`Audit`: if the user named matching origin candidates, merge those without re-asking; ask only when no branches were named; abort on a dirty tree or all-unknown names; resolve conflicts without inventing behavior; never push unless explicitly asked.
- Persist audit findings and developer fix lists under `Docs/Audit` (shared phase files plus per-dev folders).
- Prefer ponytail-style minimal fixes for audit remediation; commit only when asked (often after confirming everything is fixed).
- When handing work back to developers, phase the fix list (e.g. phase 1 / phase 2) rather than dumping an unprioritized backlog; when asked for audit status, roll up by phase and by Dev A–D.

## Learned Workspace Facts

- Parallel feature branches commonly used for merge-to-audit are `Dev-A-`, `Dev-B`, `Dev-C`, and `Dev-D` (note the trailing hyphen on `Dev-A-`).
- The integration/review branch is `Audit` (local/remote); case variant `audit` may appear in docs.
- Phases 1–5 feature work is merged; Dev C Phase 5 close-out on `Dev-C` (2026-10-07) — Phase 5 Medium/Low closed in `Docs/Audit/phase5.md` / `Docs/STATUS.md`. Sync to `Audit` before Phase 6 code.
- Dev tracks: A = Incidents/Problems/portal/ticket–KB links; B = Catalog/Requests/Changes/End-User KB/Admin catalog UI; C = Assets/Admin dashboard/KB authoring/SLA UI/CSV; D = Auth/schema/realtime/jobs/mail/Knowledge+catalog APIs/CI.
- Phase 6 (Projects / Manager / **Admin User Management**) is in `Docs/Phase/phase6.md`; do not rebuild Knowledge Base. Employee = Agent; Managers approve alongside Admin; Managers are not project_members; user CRUD is Admin-only (still open beyond picker + `PATCH …/role`).
- `Docs/Audit` holds phased audit reports (`phase1.md` … `phase5.md`) and per-developer folders (`Dev A` … `Dev D`).
- `Docs/Phase` holds per-developer implementation plans and phase notes; product docs live under `Docs/` (`PRD.md`, `FRD.md`, `Techstack.md`, `Architechture.md`, `Workflow.md`, `STATUS.md`).
- Drizzle schema lives under `apps/server`, not `packages/db`.
- Analytics/chart UI follows Bklit visual language (`.cursor/rules/charts-analytics.mdc`, bklit.com); reuse `@/components/ui/chart` unless product adopts Bklit components.
