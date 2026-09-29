import { describe, expect, it, vi } from "vitest";
import { ensureAutoCloseSchedule } from "./auto-close-schedule";
import { TICKET_AUTOCLOSE_JOB } from "./queue.constants";

describe("ensureAutoCloseSchedule", () => {
  it("skips upsert when matching cron already registered", async () => {
    const queue = {
      getJobScheduler: vi.fn().mockResolvedValue({
        pattern: "0 2 * * *",
      }),
      upsertJobScheduler: vi.fn(),
    };
    const result = await ensureAutoCloseSchedule(queue, "0 2 * * *");
    expect(result.created).toBe(false);
    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });

  it("upserts when missing or pattern differs", async () => {
    const queue = {
      getJobScheduler: vi.fn().mockResolvedValue(null),
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };
    const result = await ensureAutoCloseSchedule(queue, "0 3 * * *");
    expect(result.created).toBe(true);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      TICKET_AUTOCLOSE_JOB,
      { pattern: "0 3 * * *" },
      expect.objectContaining({ name: TICKET_AUTOCLOSE_JOB }),
    );
  });
});
