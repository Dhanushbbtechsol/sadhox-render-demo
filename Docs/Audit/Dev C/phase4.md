# Security Audit: Dev C (Phase 4)

Combined: [phase4.md](../phase4.md). Owner: assets, finance indexes, admin hooks, ticket↔asset link UI.

## Open security findings

None owned by Dev C in Phase 4 deltas. Spot-check: Admin-only asset register; Agent linked-assets omit `purchaseCost`; audit redaction includes `purchaseCost`.

## Merge coordination (blocking Audit)

Dev-C migration `0006_phase4_assets_finance_indexes` **adds** `purchase_cost`. Dev-D `0007_assets_drop_purchase_cost` **drops** it. Product must pick one before Dev-D merge completes:

- Keep finance column → skip/adapt Dev-D drop; keep schema + Admin API.
- Drop column → remove Dev-C add (or accept add-then-drop) and strip `purchaseCost` from schema/API/UI.

## Phase 2 (if keep `purchaseCost`)

- [ ] Confirm Agent list/detail never returns cost after merge settles.
- [ ] Confirm indexes migration is journaled once with unique tag/idx.
