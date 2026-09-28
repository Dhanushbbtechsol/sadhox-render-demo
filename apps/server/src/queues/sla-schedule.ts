import type { Queue } from "bullmq";
import { SLA_EVALUATOR_JOB, SLA_REPEAT_EVERY_MS } from "./queue.constants";

type SlaQueue = Pick<Queue, "getJobScheduler" | "upsertJobScheduler">;

/**
 * Ensure a single SLA evaluator schedule exists (BullMQ 6 job schedulers).
 * Idempotent: skips upsert when an equivalent scheduler is already registered.
 */
export async function ensureSlaRepeatableSchedule(
  queue: SlaQueue,
): Promise<{ created: boolean }> {
  const existing = await queue.getJobScheduler(SLA_EVALUATOR_JOB);
  if (existing && Number(existing.every) === SLA_REPEAT_EVERY_MS) {
    return { created: false };
  }

  await queue.upsertJobScheduler(
    SLA_EVALUATOR_JOB,
    { every: SLA_REPEAT_EVERY_MS },
    {
      name: SLA_EVALUATOR_JOB,
      data: {},
    },
  );
  return { created: true };
}
