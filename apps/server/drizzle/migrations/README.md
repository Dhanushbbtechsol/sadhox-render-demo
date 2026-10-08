# Drizzle migrations (apps/server)

SQL files here are applied in `_journal.json` order via `drizzle-kit migrate`.

## Journal `when` rule (Phase 7+)

Until **every** database (local, shared/TL, staging, prod) has been re-dated together:

**Any new migration’s `"when"` in `_journal.json` must be strictly greater than `1792800000000`**  
(the `when` of `0011_phase7_subcategory`).

Drizzle applies only journal entries newer than the newest applied `__drizzle_migrations.created_at`. A future-dated or out-of-order `when` can cause silent skips.

- Do not lower existing Phase 5–7 timestamps without a coordinated rebaseline.
- Prefer hand-written SQL that matches the Drizzle schema; keep `IF NOT EXISTS` for additive columns when re-applying is possible.
- Never edit applied migration SQL in place; add a new journal entry instead.

## Related notes

- `RENAME_0002_NOTE.md`, `RENAME_0003_NOTE.md` — historical shared-DB rename notes.
