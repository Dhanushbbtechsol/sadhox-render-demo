# Dev B — Phase 6 Day 30 QA Walkthrough

Manual checklist after Days 26–29 (project/module on Requests & Changes; Manager approvals).

**Seed:** `manager@sadhox.local`, project **Core Platform** (manager = Morgan), module **API**, Agent as member. Second project **Shared Infra** (Admin-owned) for “other project” ACL checks. Same seed password as other users.

## Catalog request with project

1. Sign in as End User → **Catalog** → open an item.
2. Optionally pick **Core Platform** / **API** → submit.
3. Confirm request list shows project name; detail includes project/module.

## Change create with project

1. Sign in as Agent → **Changes** → New change.
2. Attach **Core Platform** (+ module) → submit.
3. Confirm list/detail show project.

## Manager approval inbox

1. Sign in as `manager@sadhox.local` → home redirects to **/manager** (Approvals also in sidebar → `/approvals`).
2. Confirm only pending items on **owned** projects appear (not Shared Infra; not null-project).
3. Approve a request/change on Core Platform → status **Approved**.
4. Attempt approve via API on a null-project ticket → **403**.

## Admin approvals

1. Sign in as Admin → **Approvals**.
2. Confirm null-project pending items are visible and approvable.
3. Confirm all projects visible.

## Agent scoped lists & fulfillment

1. Sign in as Agent (member of Core Platform).
2. **Requests** / **Changes**: see member-project tickets + unscoped (`projectId` null); do not see other projects’ tickets.
3. Fulfillment actions only after **Approved** (unchanged).

## RBAC smoke

```bash
pnpm --filter server test -- src/common/rbac-matrix.spec.ts src/projects/project-access.service.spec.ts
```

Expect: Manager allowed on SR/Change approve; projects GET for all roles; projects POST Admin-only.
