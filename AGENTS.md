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
- When handing work back to developers, phase the fix list (e.g. phase 1 / phase 2) rather than dumping an unprioritized backlog; when asked for audit status, roll up by phase and by Dev A–D (PASS = no open High/Medium for that phase, FAIL = any High/Medium open, Low alone = PASS noted).

## Learned Workspace Facts

- Parallel feature branches commonly used for merge-to-audit are `Dev-A-`, `Dev-B`, `Dev-C`, and `Dev-D` (note the trailing hyphen on `Dev-A-`).
- The integration/review branch is `Audit` (local/remote); case variant `audit` may appear in docs.
- Phases 1–5 are merged on `Audit`; Phase 5 Mediums are closed in `Docs/Audit/phase5.md` / `Docs/STATUS.md` (Dev C still has one Low: DEV `catch→mock`). Phase 6 Dev A–D is merged on local `Audit` (may be ahead of `origin/Audit`; do not push unless asked). Phase 6 High/Medium reaudit is CLEAN (all Devs PASS); one Low remains (`seed.ts` when `SEED_PASSWORD` is unset). Phase 4 Dev D CSRF Medium is closed (Origin allowlist on refresh/logout); 3 Lows remain open.
- Dev tracks: A = Incidents/Problems/portal/ticket–KB links; B = Catalog/Requests/Changes/End-User KB/Admin catalog UI; C = Assets/Admin dashboard/KB authoring/SLA UI/CSV; D = Auth/schema/realtime/jobs/mail/Knowledge+catalog APIs/CI.
- Phase 6 (Projects / Manager / **Admin User Management**) is in `Docs/Phase/phase6.md`; do not rebuild Knowledge Base. Employee = Agent; Managers approve alongside Admin; Managers are not project_members; user CRUD is Admin-only (`POST`/`GET`/`PATCH /admin/users` + `/admin/users` UI).
- Phase 7 (EndUser desk) is merged on local `Audit`: Incidents replaced My Portal; incident + catalog subcategory; KB seed articles. Create and update share server allow-list `incident-category-map.ts` (web form mirrors it). On-screen words follow the client follow-on.
- Phase 9 is in `Docs/Phase/phase9.md` (dev files under `Docs/Phase/Dev A` … `Dev D`). Phase 8 is superseded by Phase 9. Do not use phases 10–15. Phase 9 reaudit 2026-10-10 at `aee9684`: Dev A FAIL, Dev B PASS, Dev C PASS, Dev D FAIL. The client follow-on is a separate slice after Phase 9 (`Docs/Phase/client-follow-on.md`, per-dev `client-follow-on.md`) and is on `Audit`; do not edit Phase 9 files for it and do not number it 10–15.
- `Docs/Audit` holds phased audit reports (`phase1.md` … `phase7.md`) and per-developer folders (`Dev A` … `Dev D`).
- Admin projects UI on `Audit` is a summary dialog; deleted project detail and overview pages stay deleted.
- `Docs/Phase` holds per-developer implementation plans and phase notes; product docs live under `Docs/` (`PRD.md`, `FRD.md`, `Techstack.md`, `Architechture.md`, `Workflow.md`, `STATUS.md`). Table and column catalog is `Docs/schema.md`; the mermaid ER diagram is `Docs/schema-diagram.md`. Drizzle schema is `apps/server/src/database/schema/`, not `packages/db`.
- Client follow-on on `Audit`: on-screen labels are Ticket, Issue, Request, Catalog, Change request, and Response time (stored enums and role names stay); display refs are `PREFIX-######` (INC, ISS, REQ, CHG, AST) while UUID primary keys stay; any user can hold an asset; an Admin can report one person's assets over an inclusive date range; a new incident's priority is the higher of the impact-by-urgency matrix and a 7-day open same-category floor (3–4 at least P3, 5–9 at least P2, 10 or more at least P1); a project summary dialog saves name, manager, members, and modules together; only an Admin assigns a project ticket; the Queues tab stays.
- Analytics/chart UI follows Bklit visual language (`.cursor/rules/charts-analytics.mdc`, bklit.com); reuse `@/components/ui/chart` unless product adopts Bklit components.
