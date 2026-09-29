import { beforeEach, describe, expect, it, vi } from "vitest";
import { SLA_EVALUATOR_JOB } from "./queue.constants";
import { SlaProcessor } from "./sla.processor";

describe("SlaProcessor", () => {
  const mail = { sendSlaBreach: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDb(opts: {
    candidates?: unknown[];
    returning?: { id: string }[];
    recipientEmail?: string | null;
  }) {
    const auditInserts: unknown[] = [];
    const returning = opts.returning ?? [{ id: "inc-1" }];
    const recipient =
      opts.recipientEmail === null
        ? []
        : [{ email: opts.recipientEmail ?? "agent@sadhox.local" }];

    let selectPhase = 0;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            selectPhase += 1;
            // First select in process() is the candidates list (awaited directly).
            if (selectPhase === 1 && opts.candidates) {
              return Promise.resolve(opts.candidates);
            }
            // Recipient lookups use .limit() / .orderBy().limit()
            return {
              limit: vi.fn(async () => recipient),
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => recipient),
              })),
            };
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => returning),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async (row: unknown) => {
          auditInserts.push(row);
        }),
      })),
      _auditInserts: auditInserts,
    };
    return db;
  }

  it("flags overdue active ticket once, writes audit, enqueues email", async () => {
    const candidates = [
      {
        id: "inc-1",
        title: "Outage",
        priority: "P1",
        assignedTo: "agent-1",
        slaDueAt: new Date("2020-01-01T00:00:00Z"),
      },
    ];
    const db = mockDb({ candidates });
    const processor = new SlaProcessor(db as never, mail as never);
    await processor.process({ name: SLA_EVALUATOR_JOB } as never);

    expect(db.update).toHaveBeenCalled();
    expect(db._auditInserts).toHaveLength(1);
    expect(db._auditInserts[0]).toMatchObject({
      action: "system.sla_breach",
      entityType: "incident",
      entityId: "inc-1",
      actorId: null,
    });
    expect(mail.sendSlaBreach).toHaveBeenCalledWith("agent@sadhox.local", {
      ticketId: "inc-1",
      ticketTitle: "Outage",
      priority: "P1",
      breachType: "resolve",
    });
  });

  it("skips already-flagged tickets (idempotent)", async () => {
    const db = mockDb({ returning: [] });
    const processor = new SlaProcessor(db as never, mail as never);
    const result = await processor.flagBreach({
      id: "inc-1",
      title: "Outage",
      priority: "P2",
      assignedTo: "agent-1",
      slaDueAt: new Date("2020-01-01"),
    });
    expect(result).toBe("skipped");
    expect(mail.sendSlaBreach).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("does not re-email on second flagBreach for same ticket", async () => {
    const db = mockDb({ returning: [{ id: "inc-2" }] });
    const processor = new SlaProcessor(db as never, mail as never);
    expect(
      await processor.flagBreach({
        id: "inc-2",
        title: "Late",
        priority: "P3",
        assignedTo: null,
        slaDueAt: new Date("2020-01-01"),
      }),
    ).toBe("flagged");
    expect(mail.sendSlaBreach).toHaveBeenCalledTimes(1);

    // Simulate already flagged
    const db2 = mockDb({ returning: [] });
    const processor2 = new SlaProcessor(db2 as never, mail as never);
    expect(
      await processor2.flagBreach({
        id: "inc-2",
        title: "Late",
        priority: "P3",
        assignedTo: null,
        slaDueAt: new Date("2020-01-01"),
      }),
    ).toBe("skipped");
    expect(mail.sendSlaBreach).toHaveBeenCalledTimes(1);
  });

  it("ignores unknown job names", async () => {
    const db = mockDb({});
    const processor = new SlaProcessor(db as never, mail as never);
    await processor.process({ name: "other-job" } as never);
    expect(db.select).not.toHaveBeenCalled();
  });
});
