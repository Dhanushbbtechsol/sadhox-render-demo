# Checkpoint 4 — Phase 4 (Dev B)

**Date:** 2026-09-30  
**Source of truth:** [phase4.md](./phase4.md)

## Days 16–20 vs `phase4.md`

| Day | Requirement | Evidence |
| --- | --- | --- |
| 16 | Walkthrough 1: laptop SR → Admin notify → approve → Agent fulfill → requester confirmation | `ServiceRequestsService` admin review mail on create; fulfill → `sendRequestDecision(Fulfilled)`; `scripts/checkpoint4-walkthrough.mjs` |
| 16 | Walkthrough 2: Normal Change → Admin approve → Implemented | Change create/approve; UI “Mark implemented”; walkthrough script |
| 17 | EndUser cannot tamper approval status | Create DTO has no `status`; `forbidNonWhitelisted`; controller spec + walkthrough |
| 17 | Mandatory rollback on Normal/Emergency | `CreateChangeDto` `@ValidateIf` + service trim check; `change.dto.spec.ts` |
| 17 | Scheduled end after start | DTO `@Validate(IsAfterScheduledStart)` + service assert; specs + walkthrough |
| 18 | Empty states (inbox / catalog) | `EmptyState` in approval inbox + catalog grid |
| 18 | Rejection confirmation modal + reason | `RejectRequestDialog` |
| 18 | Toasts on submit / status updates | Catalog submit, inbox approve/reject, change create/implemented |
| 19 | Staging seed catalog + historical changes | `catalog.seed.ts` + `scripts/seed.ts` showcase changes; seed prints validation counts |
| 20 | Prod build + Resend routing | Checklist below; walkthrough against staging URL |

## Local verification

```bash
# API + Redis + Postgres running; users seeded
SEED_PASSWORD=... DATABASE_URL=... REDIS_URL=... \
  node apps/server/scripts/checkpoint4-walkthrough.mjs

pnpm --filter server test
pnpm --filter web build
```

## Production go-live checklist (Day 20)

- [ ] `pnpm --filter web build` succeeds with production `VITE_SERVER_URL` (HTTPS)
- [ ] API `/health` / `/health/live` returns `{ status: "ok" }` (no dependency leak)
- [ ] `GET /health/ready` with Admin JWT reports DB + Redis healthy
- [ ] Approve a service request and confirm Resend delivery from production `MAIL_FROM` domain
- [ ] Confirm admin receives request-review / change-review jobs (BullMQ + Resend)
- [ ] Fulfill a request and confirm requester receives Fulfilled decision email

## Explicit non-goals

- Actual cloud cutover / DNS / Resend domain verification outside the repo
- Agent availability / shift filtering (still Phase 4 backlog for other tracks)
