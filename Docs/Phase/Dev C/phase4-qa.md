# Dev C — Phase 4 QA & Go-Live Checklist

## Merge fix

- [x] `framer-motion` linked under `apps/web` (cinematic theme switcher resolves)

## Day 16 — Cross-module walkthrough

1. Login as Admin.
2. Create an asset (include optional purchase cost).
3. Create / open an incident (Dev A), copy its UUID.
4. Asset register → **Link / unlink ticket** → paste incident UUID → Link.
5. Change asset status (Edit → InRepair / Active) and confirm Audit Log shows the mutation.
6. Open the incident detail as Admin or Agent → **Linked assets** lists the asset (no purchase cost shown).
7. Unlink from asset actions and confirm the incident section clears.

### Email client QA (manual Resend)

- [ ] Trigger ticket-assigned / status-changed / SLA breach / request-decision (or dry-run HTML from processor).
- [ ] Open in Gmail web — layout, buttons, badges readable.
- [ ] Open in Outlook (desktop or web) — same checks; no broken CSS columns.

## Day 17 — Security

- [x] Assets CRUD / delete remain `@Roles("Admin")`.
- [x] `purchaseCost` Admin-only on asset APIs; omitted from `GET /incidents/:id/linked-assets`.
- [x] `purchaseCost` / `purchase_cost` redacted in audit diffs.
- [x] Search uses parameterized Drizzle `ilike`; Phase 4 spec asserts injection payload does not dump rows.
- [x] RBAC matrix includes linked-assets (Admin + Agent only).
- [ ] Smoke: Agent/EndUser JWT → `DELETE /assets/:id` → 403.

## Day 18 — Performance & polish

- [x] Migration `0006_phase4_assets_finance_indexes.sql`: `assets_status_idx`, `assets_linked_ticket_id_idx`, `purchase_cost`.
- [ ] After migrate + seed, time Admin chart endpoints (`/admin/charts/*`) — target &lt; 200ms warm.
- [x] Asset register / admin filters use tablet-friendly stacking (`md:` breakpoints).

## Day 19 — Seed

- [x] `seedPhase4Assets` inserts 120 assets with prefix `P4-` (varied type/status/cost; some linked).
- [x] Run: `pnpm --filter server db:migrate` then `pnpm --filter server db:seed` (120 `P4-` assets seeded locally).

## Day 20 — Production go-live

- [x] `pnpm --filter web build` and server typecheck / Phase 4 assets specs green.
- [ ] Deploy web (Vercel) pointing at Railway/Render API `VITE_SERVER_URL`.
- [ ] Prod smoke: Admin login → dashboard charts → asset register → link → audit → incident linked assets.
- [ ] Hand off metrics (ticket volume, SLA %, asset count) to stakeholders.

### Handoff notes

| Metric | Staging / Prod value | Date |
| --- | --- | --- |
| Total tickets (dashboard) | | |
| SLA compliance % | | |
| Asset count (P4 seed + live) | | |
| Chart p95 latency | | |
