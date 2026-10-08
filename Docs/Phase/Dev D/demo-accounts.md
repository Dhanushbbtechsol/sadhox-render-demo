# Local demo accounts — Agent & EndUser visible data

After `pnpm --filter server db:seed`, these logins should show non-empty tabs.

| Email | Role | Password | Lands on | Should see |
| --- | --- | --- | --- | --- |
| `agent@sadhox.local` | Agent | See below | `/incidents` | Incidents, Problems, Changes, Requests (Platform Ops + unscoped) |
| `enduser@sadhox.local` | EndUser | See below | `/portal` | Own incidents + Requests |
| `user@sadhox.local` | EndUser (Pat Portal) | See below | `/portal` | Own incidents + Requests |
| `admin@sadhox.local` | Admin | See below | `/admin` | Everything |
| `manager@sadhox.local` | Manager | See below | Manager home | Own project (Platform Ops) |

Password: set `SEED_PASSWORD=...` when seeding **new** users, or copy the one-time value printed to stdout if unset. Re-seed does not change existing passwords. Use `scripts/reset-seed-password.mjs` only when you intentionally want a new hash.

## Seed sources (Dev D)

| Pack | Prefix | Notes |
| --- | --- | --- |
| Showcase | `[Showcase]` | Volume for Admin charts; skipped if any already exist |
| Scenario | `[Scenario]` | Narrative Platform Ops week; skipped if any already exist |
| **Role-visible demo** | `[Demo]` | **Always** upserts fixed IDs so Agent + both EndUsers have tab data |

If tabs look empty:

1. Confirm Postgres is up (`docker compose up -d` → port **5437**).
2. Re-run: `pnpm --filter server db:seed`
3. Look for log line: `role-visible demo ensured: …`
4. Log in with the emails above (not a random Admin-created user without tickets).
