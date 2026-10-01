# Day 17 — Load testing notes (Dev D)

## SameSite (precondition — resolved)

Production is **cross-site**: Vercel frontend ↔ Render/Railway API (see
[cross-site-refresh-cookie.md](./cross-site-refresh-cookie.md)).

Cookie policy in code:

| Env | SameSite | Secure |
| --- | --- | --- |
| `development` | `Lax` | false |
| `production` | **`None`** | **true** |

`Lax` is **not** enough for `fetch(..., { credentials: "include" })` refresh
across sites — only `None` + `Secure` is. Staging proof is the manual checklist
in that doc (Supertest cannot simulate browser SameSite).

## Schema lock before load (remote)

See [schema-lock-2026-09-30.md](./schema-lock-2026-09-30.md).

- Journal **0000–0006** hash-matched (7 rows).
- Orphan journal hash purged.
- `assets.purchase_cost`: **kept** after Audit merge (Dev-C Phase 4); Dev-D drop migration not taken.

## Pool / throttle tuning shipped

| Knob | Default | Load-test profile |
| --- | --- | --- |
| `DB_POOL_MAX` | 10 | **25** |
| `THROTTLE_GLOBAL_LIMIT` | 100/min | **20000** (test only) |
| BullMQ Redis | `maxRetriesPerRequest: null` (required by BullMQ) | unchanged |

Without raising throttle, a 100 req/s run is capped by the global 100/min limiter
(429s) — that is intentional for prod; load runs must override via env.

## Scripts

```bash
cd apps/server
# Nest must be up against remote PG/Redis with load-test env knobs
node scripts/load/run-http-load.mjs
node scripts/load/run-socket-load.mjs
```

## Run status (2026-09-30 ~16:37 IST) — live Day 17

Target: local Nest `:3000` → remote `192.168.68.111` (PG 5437 / Redis 16379).  
Load profile: `DB_POOL_MAX=25`, `THROTTLE_GLOBAL_LIMIT=20000` (restored to `100` after HTTP run).

### HTTP (`scripts/load/http-load-results.json`) — PASS

| Scenario | Completed | Avg req/s | p99 latency | non2xx | errors | timeouts |
| --- | --- | --- | --- | --- | --- | --- |
| GET `/incidents` (15s, rate 100, 25 conn) | 1500 | **100** | 412 ms | **0** | **0** | **0** |
| POST `/incidents` (10s, rate 50, 15 conn) | 496 | **49.6** | 374 ms | **0** | **0** | **0** |

All list responses **200**; all creates **201**. No pool-exhaustion or timeout errors during HTTP (`x-ratelimit-limit: 20000` active).

### Socket.IO (`scripts/load/socket-load-results.json`) — PASS (retest 16:32 UTC / ~17:02 IST)

Initial run failed (55 connected / 0 joined) due to global HTTP guards on WS + auth race. After fixes + host recovery:

| Metric | Value |
| --- | --- |
| Clients attempted | 55 |
| Connected | **55** |
| Joined room | **55** |
| Still connected after 2s | **55** |
| Errors | **0** |

Single-client debug: `join ack { ok: true, room: "ticket:…" }`.

### Proposed tuning (do **not** apply yet)

| Knob | Current (prod default) | Proposal from this run | Rationale |
| --- | --- | --- | --- |
| `THROTTLE_GLOBAL_LIMIT` | 100/min | **Keep 100** for prod | Load test required override; 100/min is abuse protection, not capacity |
| `DB_POOL_MAX` | 10 default / 25 during test | **Keep 10**; optional **15–20** only if staging shows pool wait | 100 GET/s + 50 POST/s with pool 25: **0** timeouts/errors — no exhaustion evidence. Do not raise past 25 without measured wait time |
| Redis / BullMQ | `maxRetriesPerRequest: null` | **No change** | No Redis timeouts during the successful HTTP window |

Day 17 HTTP + Socket criteria: **met**. Tuning proposals above remain unapplied.
