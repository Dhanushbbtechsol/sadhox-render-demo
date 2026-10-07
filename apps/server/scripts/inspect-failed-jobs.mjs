/**
 * Inspect BullMQ failed jobs for sla-queue and email-queue.
 * Requires REDIS_URL (no host fallback).
 *
 * Example:
 *   REDIS_URL=redis://127.0.0.1:16379 node scripts/inspect-failed-jobs.mjs
 *
 * Or with apps/server/.env:
 *   node scripts/inspect-failed-jobs.mjs
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { requireEnv } from "./require-env.mjs";

const { REDIS_URL: url } = requireEnv(["REDIS_URL"]);
const names = ["sla-queue", "email-queue", "ticket-lifecycle-queue"];

console.log("REDIS_URL_HOST", new URL(url).host);

const connection = new IORedis(url, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});

try {
  await connection.connect();
  console.log("REDIS_PING", await connection.ping());
} catch (e) {
  console.error(
    "REDIS_CONNECT_FAIL",
    e instanceof Error ? e.message : String(e),
  );
  process.exit(1);
}

for (const name of names) {
  const queue = new Queue(name, { connection });
  try {
    const counts = await queue.getJobCounts(
      "active",
      "waiting",
      "completed",
      "failed",
      "delayed",
    );
    console.log(`\n===== ${name} counts =====`);
    console.log(JSON.stringify(counts));

    const failed = await queue.getJobs(["failed"], 0, 20, true);
    console.log(`FAILED_COUNT_FETCHED=${failed.length}`);
    for (const job of failed) {
      console.log("---");
      console.log(
        JSON.stringify(
          {
            id: job.id,
            name: job.name,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp
              ? new Date(job.timestamp).toISOString()
              : null,
            finishedOn: job.finishedOn
              ? new Date(job.finishedOn).toISOString()
              : null,
            failedReason: job.failedReason ?? null,
            stacktrace: (job.stacktrace ?? []).slice(0, 3),
            dataPreview:
              typeof job.data === "object"
                ? {
                    kind: job.data?.kind,
                    to: job.data?.to
                      ? String(job.data.to).replace(/^[^@]+/, "***")
                      : undefined,
                    name: job.name,
                  }
                : job.data,
          },
          null,
          2,
        ),
      );
    }
    if (failed.length === 0) {
      console.log("(no failed jobs in this queue)");
    }
  } catch (e) {
    console.error(
      `QUEUE_ERR ${name}`,
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    await queue.close();
  }
}

await connection.quit();
