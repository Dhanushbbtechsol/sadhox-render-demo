/**
 * Remove stale failed jobs from sla-queue (remote Redis).
 * Usage: REDIS_URL=redis://192.168.68.111:16379 node scripts/clean-sla-failed-jobs.mjs
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://192.168.68.111:16379";
const connection = new IORedis(url, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});
await connection.connect();

const queue = new Queue("sla-queue", { connection });
const before = await queue.getJobCounts("failed", "completed", "delayed");
console.log("BEFORE", before);

const failed = await queue.getJobs(["failed"], 0, 100, true);
console.log("FAILED_TO_REMOVE", failed.length);
for (const job of failed) {
  console.log(
    `remove id=${job.id} reason=${(job.failedReason ?? "").slice(0, 80)}`,
  );
  await job.remove();
}

const after = await queue.getJobCounts("failed", "completed", "delayed");
console.log("AFTER", after);

await queue.close();
await connection.quit();
