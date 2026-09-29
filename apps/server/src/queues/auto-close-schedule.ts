import type { Queue } from "bullmq";
import {
  TICKET_AUTOCLOSE_JOB,
} from "./queue.constants";

type LifecycleQueue = Pick<Queue, "getJobScheduler" | "upsertJobScheduler">;

/**
 * Idempotent daily (cron) auto-close scheduler.
 * Skips upsert when an equivalent pattern is already registered.
 */
export async function ensureAutoCloseSchedule(
  queue: LifecycleQueue,
  cronPattern: string,
): Promise<{ created: boolean }> {
  const existing = await queue.getJobScheduler(TICKET_AUTOCLOSE_JOB);
  if (existing && existing.pattern === cronPattern) {
    return { created: false };
  }

  await queue.upsertJobScheduler(
    TICKET_AUTOCLOSE_JOB,
    { pattern: cronPattern },
    {
      name: TICKET_AUTOCLOSE_JOB,
      data: {},
    },
  );
  return { created: true };
}
