# Security Audit: Dev A (Phase 5)

Reaudit 2026-10-07. Combined: [phase5.md](../phase5.md). **CLEAN.**

## Open findings assigned to Dev A

**None.**

## Spot-checked (clean)

- `RelatedArticles` mutate gated Admin/Agent; portal uses `readOnly`
- Server `assertCanAccessTicket` on list/link/unlink (EndUser own incident/request only)
- Draft articles hidden from non-Admin on get/list
- `use-knowledge.ts` correctly unwraps `{ data }` list envelopes

## Reminder

Keep client `readOnly` as UX only — Nest `@Roles` + `assertCanAccessTicket` remain the control.
