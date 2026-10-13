import { beforeEach, describe, expect, it, vi } from "vitest";
import { TICKET_AUTOCLOSE_JOB } from "./queue.constants";
import { TicketLifecycleProcessor } from "./ticket-lifecycle.processor";

describe("TicketLifecycleProcessor", () => {
  const events = { emitTicketUpdated: vi.fn() };
  const config = {
    get: vi.fn((key: string) => (key === "AUTO_CLOSE_DAYS" ? 3 : undefined)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDb(opts: {
    candidates?: unknown[];
    returning?: { id: string }[];
  }) {
    const auditInserts: unknown[] = [];
    const returning = opts.returning ?? [{ id: "inc-1" }];

    return {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(opts.candidates ?? [])),
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
  }

  it("closes eligible Resolved tickets and writes system audit (actor null)", async () => {
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const db = mockDb({
      candidates: [
        {
          id: "inc-1",
          title: "Old resolved",
          status: "Resolved",
          resolvedAt: old,
        },
      ],
    });
    const processor = new TicketLifecycleProcessor(
      db as never,
      events as never,
      config as never,
    );
    await processor.process({ name: TICKET_AUTOCLOSE_JOB } as never);

    expect(db.update).toHaveBeenCalled();
    expect(db._auditInserts).toHaveLength(1);
    expect(db._auditInserts[0]).toMatchObject({
      actorId: null,
      action: "system.auto_close",
      entityType: "incident",
      entityId: "inc-1",
    });
    expect(db._auditInserts[0]).toMatchObject({
      diff: {
        event: "STATUS_CHANGED",
        status: { before: "Resolved", after: "Closed" },
        system: true,
      },
    });
    expect(events.emitTicketUpdated).toHaveBeenCalledWith(
      "inc-1",
      expect.objectContaining({ status: "Closed", closedBy: "system" }),
    );
  });

  it("leaves recently resolved tickets alone (no candidates)", async () => {
    const db = mockDb({ candidates: [] });
    const processor = new TicketLifecycleProcessor(
      db as never,
      events as never,
      config as never,
    );
    await processor.process({ name: TICKET_AUTOCLOSE_JOB } as never);
    expect(db.update).not.toHaveBeenCalled();
    expect(events.emitTicketUpdated).not.toHaveBeenCalled();
  });

  it("skips if status already changed (idempotent)", async () => {
    const db = mockDb({ returning: [] });
    const processor = new TicketLifecycleProcessor(
      db as never,
      events as never,
      config as never,
    );
    const result = await processor.closeTicket({
      id: "inc-1",
      title: "x",
      status: "Resolved",
      resolvedAt: new Date("2020-01-01"),
    });
    expect(result).toBe("skipped");
    expect(db.insert).not.toHaveBeenCalled();
  });
});
