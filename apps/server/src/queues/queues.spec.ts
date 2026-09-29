import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_QUEUE,
  SLA_EVALUATOR_JOB,
  SLA_QUEUE,
  SLA_REPEAT_EVERY_MS,
  TICKET_LIFECYCLE_QUEUE,
} from "./queue.constants";
import { ensureSlaRepeatableSchedule } from "./sla-schedule";

describe("queue config", () => {
  it("exports the three primary queue names", () => {
    expect(SLA_QUEUE).toBe("sla-queue");
    expect(TICKET_LIFECYCLE_QUEUE).toBe("ticket-lifecycle-queue");
    expect(EMAIL_QUEUE).toBe("email-queue");
  });

  it("defines default job options with retries and cleanup limits", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 2000,
    });
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toBe(100);
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBe(1000);
    expect(typeof DEFAULT_JOB_OPTIONS.removeOnFail).toBe("number");
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).not.toBe(true);
  });

  it("schedules SLA evaluator every 5 minutes", () => {
    expect(SLA_REPEAT_EVERY_MS).toBe(5 * 60 * 1000);
    expect(SLA_EVALUATOR_JOB).toBe("sla-breach-evaluator");
  });
});

describe("ensureSlaRepeatableSchedule", () => {
  it("upserts the job scheduler when none exists", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
    const getJobScheduler = vi.fn().mockResolvedValue(undefined);
    const result = await ensureSlaRepeatableSchedule({
      upsertJobScheduler,
      getJobScheduler,
    });
    expect(result.created).toBe(true);
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      SLA_EVALUATOR_JOB,
      { every: SLA_REPEAT_EVERY_MS },
      { name: SLA_EVALUATOR_JOB, data: {} },
    );
  });

  it("is idempotent when an equivalent scheduler already exists", async () => {
    const upsertJobScheduler = vi.fn();
    const getJobScheduler = vi.fn().mockResolvedValue({
      key: SLA_EVALUATOR_JOB,
      name: SLA_EVALUATOR_JOB,
      every: SLA_REPEAT_EVERY_MS,
    });
    const result = await ensureSlaRepeatableSchedule({
      upsertJobScheduler,
      getJobScheduler,
    });
    expect(result.created).toBe(false);
    expect(upsertJobScheduler).not.toHaveBeenCalled();
  });
});
