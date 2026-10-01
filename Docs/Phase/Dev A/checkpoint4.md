# Checkpoint 4 — Phase 4 (Dev A)

**Date:** 2026-09-30  
**Source of truth:** [phase4.md](./phase4.md)

## Days 16–20 vs `phase4.md`

| Day | Requirement | Evidence |
| --- | --- | --- |
| 16 | Cross-module walkthrough (report → P2 → assign → live comment → link Problem → resolve) | Priority P2 matrix + transitions in `phase4.spec.ts`; UI: create → assign/actions → comments socket → `LinkToProblem` on incident detail → resolve with notes |
| 16 | Comment stream race / glitch fixes | `useCreateComment` append-by-id (no invalidate flicker); socket + mutate id-dedupe; scroll-into-view on live append |
| 17 | EndUser assign / POST problems → 403 | Live route is **POST** `/incidents/:id/assign` (Phase 3); covered in `phase4.spec.ts` (POST + PATCH alias) |
| 17 | Comment XSS sanitation | `sanitizePlainText` on incident comment create; unit + phase4 comment tests; React still renders plain text |
| 18 | Ticket table pagination | Incidents / problems / portal use `page` + `ListPagination` (page size 20) |
| 18 | Responsive layout | Mobile card list + desktop table on incident queue; fluid filters; detail `px` padding |
| 18 | Keyboard nav for status / queue | Queue: `j`/`k`/arrows + Enter; detail: `⌘/Ctrl+Shift+]` advances status; comments: `⌘/Ctrl+Enter` post |
| 19 | Staging seed P1–P4 all statuses | `scripts/seed.ts` lifecycle matrix (5 statuses × 4 priorities) + closed rows |
| 20 | Prod go-live verification | Checklist below (ops / staging cutover with Dev D) |

## Day 20 production verification checklist

- [ ] Vercel production frontend builds and loads against production API (`VITE_SERVER_URL` HTTPS)
- [ ] EndUser can create an incident; priority/SLA computed server-side
- [ ] Agent auto-assign + Socket.io `comment.created` on `ticket:{id}` room
- [ ] Ticket-assigned email delivered via Resend (Dev D mail queue)
- [ ] EndUser receives 403 on assign and `POST /problems`
- [ ] Incident queue pagination and mobile card layout smoke-tested

## Verification (local)

```bash
pnpm --filter server test
pnpm --filter server check-types
pnpm --filter web check-types
```

## Explicit non-goals

1. Full Playwright browser E2E suite — contract tests + seed matrix cover Day 16/19; UI E2E can follow.
2. Production infra cutover — owned with Dev D Phase 4 (Render/Railway, secrets, Sentry).
