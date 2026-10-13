/**
 * Remove failed jobs from sla-queue (target Redis).
 * Local/lab ops only — requires REDIS_URL (no host fallback).
 *
 * Notes:
 * - Failed child ticks have ids like `repeat:sla-breach-evaluator:<ts>`.
 *   Those are normal BullMQ repeatable *instances*, not schedulers.
 *   Removing them uses `job.remove()` (paginated). Do NOT call
 *   removeRepeatableByKey / removeJobScheduler for those ids.
 * - The durable schedule is separate: Queue.getJobSchedulers() → key
 *   `sla-breach-evaluator`. This script only reports that count; it
 *   never deletes the healthy scheduler.
 *
 * Example:
 *   REDIS_URL=redis://127.0.0.1:16379 node scripts/clean-sla-failed-jobs.mjs
 *
 * Or with apps/server/.env:
 *   node scripts/clean-sla-failed-jobs.mjs
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { requireEnv } from "./require-env.mjs";

const { REDIS_URL: url } = requireEnv(["REDIS_URL"]);
const connection = new IORedis(url, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});
await connection.connect();

const queue = new Queue("sla-queue", { connection });

const schedulers = await queue.getJobSchedulers(0, 100, true);
console.log(
  "SCHEDULERS",
  schedulers.map((s) => ({
    key: s.key,
    name: s.name,
    every: s.every,
    next: s.next ? new Date(s.next).toISOString() : null,
  })),
);
if (schedulers.length !== 1) {
  console.warn(
    `WARN: expected exactly 1 sla-queue job scheduler, found ${schedulers.length}`,
  );
}

const before = await queue.getJobCounts("failed", "completed", "delayed");
console.log("BEFORE", before);

let removed = 0;
let removeErrors = 0;
const reasonSample = new Map();

for (;;) {
  // Always fetch from offset 0 — removals shrink the failed set.
  const failed = await queue.getJobs(["failed"], 0, 99, true);
  if (failed.length === 0) break;

  for (const job of failed) {
    const failedReason = (job.failedReason ?? "(none)").split("\n")[0];
    const short = failedReason.slice(0, 100);
    reasonSample.set(short, (reasonSample.get(short) ?? 0) + 1);
    console.log(
      `removing failed job id=${job.id} failedReason=${short}`,
    );
    try {
      await job.remove();
      removed += 1;
    } catch (err) {
      removeErrors += 1;
      console.error(
        "REMOVE_ERR id=%s %s",
        job.id,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

console.log("REMOVED", removed, "REMOVE_ERRORS", removeErrors);
console.log(
  "FAILED_REASON_SAMPLE",
  Object.fromEntries([...reasonSample.entries()].slice(0, 5)),
);

const after = await queue.getJobCounts("failed", "completed", "delayed");
console.log("AFTER", after);

const schedulersAfter = await queue.getJobSchedulers(0, 100, true);
console.log(
  "SCHEDULERS_AFTER_COUNT",
  schedulersAfter.length,
  "keys=",
  schedulersAfter.map((s) => s.key).join(","),
);

await queue.close();
await connection.quit();
