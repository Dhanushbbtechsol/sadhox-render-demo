# sadhox

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: node
- **Package Manager**: pnpm

### Frontend

- Framework: react-vite
- CSS: tailwind
- UI Library: shadcn-ui
- State: zustand

### Backend

- Framework: hono

### Database

- Database: postgres

### Authentication

- Provider: supabase-auth

### Additional Features

- Email: resend

## Project Structure

```
sadhox/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend API
├── packages/
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm db:push` - Push database schema
- `pnpm db:studio` - Open database UI

## Better Fullstack project context

`bts.jsonc` is the authority for the current Stack Graph. Its `stackParts` array owns role selection and `ownerPartId` bindings. Top-level option fields are a compatibility projection and must not become a second mutation path.

### Stack Parts, ownership, and evidence

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

Keep AGENTS.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.

## Learned User Preferences

- Use merge-to-audit for combining selected Dev branches into `audit`/`Audit`: ask which branches when unspecified, abort on a dirty tree, resolve conflicts without inventing behavior, and never push unless explicitly asked.
- Persist audit findings and developer fix lists under `Docs/Audit` (shared phase files plus per-dev folders).
- Prefer ponytail-style minimal fixes for audit remediation; commit only when asked (often after confirming everything is fixed).
- When handing work back to developers, phase the fix list (e.g. phase 1 / phase 2) rather than dumping an unprioritized backlog.

## Learned Workspace Facts

- Parallel feature branches commonly used for merge-to-audit are `Dev-A-`, `Dev-B`, `Dev-C`, and `Dev-D` (note the trailing hyphen on `Dev-A-`).
- The integration/review branch is `audit` (case variant `Audit` may also exist remotely).
- `Docs/Audit` holds phased audit reports (`phase1.md`, `phase2.md`, `phase3.md`) and per-developer folders (`Dev A` … `Dev D`).
- `Docs/Phase` holds per-developer implementation plans and phase notes; product docs live under `Docs/` (`PRD.md`, `FRD.md`, `Techstack.md`, `Architechture.md`).
