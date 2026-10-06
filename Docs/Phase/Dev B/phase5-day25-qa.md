# Dev B — Phase 5 Day 25 QA Walkthrough

Manual checklist after Days 21–24 (Knowledge portal, Admin catalog CRUD, related help).

## End User: Knowledge → request / incident

1. Sign in as `enduser@sadhox.local` (or seeded End User).
2. Open **Knowledge** in the sidebar (`/knowledge`).
3. Confirm only **Published** articles appear (no Draft).
4. Search (e.g. `VPN`) and filter by category **Access**.
5. Open an article (`/knowledge/:slug`).
6. Use **Start a catalog request** → Catalog → open an item matching the article’s department.
7. Confirm **Related help articles** deep-link back to `/knowledge/:slug`.
8. Submit a request, or from the article use **Report an incident** → Portal.

## Agent

1. Sign in as Agent.
2. Confirm **Knowledge** nav is visible; browse/search works (Published only).
3. Confirm **Catalog admin** is not in the sidebar.
4. `POST /service-catalog` and `PATCH /service-catalog/:id` return **403**.

## Admin catalog writes

1. Sign in as Admin → **Catalog admin** (`/admin/catalog`).
2. Create an item (name, department, form fields, active).
3. Edit fields; deactivate → item disappears from End User `/catalog`.
4. Reactivate → visible again on `/catalog`.
5. Confirm End User / Agent still get **403** on write APIs (RBAC matrix + smoke).

## Edge cases

- Knowledge empty search / no-results empty state.
- Catalog browse with no active items.
- Related help when department has no matching category: section omitted or “no published help”.
- Inactive catalog items listed only for Admin with `?includeInactive=true`.

## Automated smoke

```bash
pnpm --filter @sadhox/server test -- src/common/rbac-matrix.spec.ts
```

Expect Knowledge GETs allowed for Admin/Agent/EndUser; catalog POST/PATCH Admin-only.
