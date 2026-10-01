# Render Postgres backup & point-in-time restore runbook

Source: [Render Postgres Recovery and Backups](https://render.com/docs/postgresql-backups) (fetched 2026-09-30).  
**Prep only** — do not run recovery or exports against live DBs without an explicit go-ahead.

## Capability matrix (critical for Sadhox)

| Database compute plan | Continuous PITR | Logical exports (Dashboard) |
| --- | --- | --- |
| **Free** (`plan: free` in staging Blueprint) | **Not available** | **Not available** in Dashboard |
| Paid (Hobby workspace window / paid instance) | Yes | Yes |

Staging Blueprint currently uses **Postgres `plan: free`**. That means **no managed PITR and no Dashboard logical exports** until the DB is upgraded to a paid compute plan.

| Workspace plan | PITR retention window |
| --- | --- |
| Hobby | Past **3 days** |
| Pro or higher | Past **7 days** |

Upgrading workspace plan does **not** backfill a longer window retroactively — the window grows going forward only.

## Recommended production posture

1. Before treating an environment as production-ready for DR: upgrade Postgres off Free.
2. Prefer **PITR** for accidental data loss (newer data than a logical export in most cases).
3. Use **logical exports** for portable archives, cross-platform copies, or long-term retention outside Render (Dashboard exports are retained **7 days** after creation).
4. Optional: automate `pg_dump` → object storage (Render’s “Backup Render Postgres to Amazon S3” guide) if you need retention beyond 7 days.

## A. Point-in-time recovery (paid instances only)

1. Dashboard → select Postgres service → **Recovery**.
2. **Point-in-Time Recovery** → **Restore Database**.
3. Set:
   - Name for the **new** recovery instance
   - Restore timestamp (**cannot** be within **10 minutes** of now)
   - Whether to copy existing settings (or customize plan / Datadog / project)
4. **Start Recovery** → wait until status is **Available**.
5. Validate with the recovery instance **PSQL** command from its Info page (isolated — services still point at the original DB).
6. Point app `DATABASE_URL` (and any env group) at the recovery instance connection string.
7. Confirm API `/health` + `/health/ready` and a smoke login.
8. Only then suspend/delete the original instance.

PITR always creates a **separate** instance — it does not overwrite the live DB in place.

## B. Logical backup (Dashboard export — paid only)

1. Dashboard → Postgres → **Recovery** → **Create export**.
2. Wait until the `.dir.tar.gz` appears; download within **7 days**.
3. Restore (into an empty / disposable target only):

```bash
tar -zxvf <export>.dir.tar.gz
pg_restore --dbname="$TARGET_DATABASE_URL" \
  --verbose --clean --if-exists --no-owner --no-privileges \
  --format=directory <extracted_dir>/<db_name>
```

Do **not** restore with `--clean` into a database that still holds important data you need.

## C. Free / staging fallback (`pg_dump` from a trusted machine)

When the instance is Free (or you need an ad-hoc dump):

```bash
pg_dump --dbname="$EXTERNAL_DATABASE_URL" -n public --no-owner > sadhox-backup.sql
# restore only into an empty DB:
psql --dbname="$TARGET_DATABASE_URL" < sadhox-backup.sql
```

Directory / parallel form (large DB):

```bash
pg_dump --dbname="$EXTERNAL_DATABASE_URL" -n public --no-owner \
  --format=directory --jobs=4 --compress=0 -f sadhox.dump/
```

## D. Sadhox rehearsal checklist (when approved)

- [ ] Confirm Postgres plan is **paid** if testing Dashboard PITR/export
- [ ] Create a disposable recovery instance (or dump into a throwaway DB)
- [ ] Validate row counts for `users`, `sla_rules`, `service_catalog`, `incidents`
- [ ] Point a non-prod API at the recovery URL and hit `GET /health`
- [ ] Document time-to-recover and who can click Restore in the Dashboard
- [ ] Tear down the rehearsal recovery instance

## Blockers noted

- Staging Free Postgres: rehearse PITR only after upgrade, or rehearse with `pg_dump` only.
- Do not run this runbook against production until Day 19 execution is explicitly approved.
