import { beforeEach, describe, expect, it, vi } from "vitest";
import { SLA_EVALUATOR_JOB } from "./queue.constants";
import { SlaProcessor } from "./sla.processor";

describe("SlaProcessor", () => {
  const mail = { sendSlaBreach: vi.fn() };
  const notifications = { record: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDb(opts: {
    candidates?: unknown[];
    returning?: { id: string }[];
    recipientRows?: { id: string; email: string }[];
    rule?: { notifyManager: boolean; notifyAdmin: boolean };
    assigneeReportsTo?: string | null;
  }) {
    const auditInserts: unknown[] = [];
    const returning = opts.returning ?? [{ id: "inc-1" }];
    const recipientRows = opts.recipientRows ?? [
      { id: "agent-1", email: "agent@sadhox.local" },
    ];
    const rule = opts.rule ?? { notifyManager: true, notifyAdmin: false };

    let selectPhase = 0;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            selectPhase += 1;
            if (selectPhase === 1 && opts.candidates) {
              return Promise.resolve(opts.candidates);
            }
            // escalation rule / assignee / admins / recipient emails
            return {
              limit: vi.fn(async () => {
                if (selectPhase <= 3) {
                  // rule or assignee reportsTo
                  if (selectPhase === 2) return [rule];
                  return [{ reportsToId: opts.assigneeReportsTo ?? null }];
                }
                return recipientRows;
              }),
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => recipientRows),
              })),
            };
          }),
          innerJoin: vi.fn(() => ({
            where: vi.fn(async () => opts.candidates ?? []),
          })),
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

    // After breach update, notifyEscalation does: rule, assignee, admins, then inArray users
    // Make chained selects more permissive
    db.select = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.from = vi.fn(self);
      chain.where = vi.fn(() => {
        selectPhase += 1;
        if (selectPhase === 1 && opts.candidates) {
          return Promise.resolve(opts.candidates);
        }
        return {
          limit: vi.fn(async () => {
            // First limit after breach: escalation rule
            return [rule];
          }),
          then: undefined,
        };
      });
      chain.innerJoin = vi.fn(() => ({
        where: vi.fn(async () => opts.candidates ?? []),
      }));
      // Direct await of where for admins / inArray recipients
      const whereResult = {
        limit: vi.fn(async () => [{ reportsToId: opts.assigneeReportsTo ?? null }]),
        // thenable for admins / recipients list
        then: (resolve: (v: unknown) => void) =>
          resolve(
            selectPhase >= 3
              ? recipientRows
              : [{ id: "admin-1", email: "admin@sadhox.local" }],
          ),
      };
      chain.where = vi.fn(() => {
        selectPhase += 1;
        if (selectPhase === 1 && opts.candidates) {
          return Promise.resolve(opts.candidates);
        }
        return whereResult;
      });
      return chain;
    });

    return db;
  }

  it("flags overdue active ticket once, writes audit", async () => {
    const db = mockDb({ returning: [{ id: "inc-1" }] });
    const processor = new SlaProcessor(
      db as never,
      mail as never,
      notifications as never,
    );
    const result = await processor.flagBreach({
      id: "inc-1",
      title: "Outage",
      priority: "P1",
      assignedTo: "agent-1",
      slaDueAt: new Date("2020-01-01T00:00:00Z"),
    });

    expect(result).toBe("flagged");
    expect(db.update).toHaveBeenCalled();
    expect(db._auditInserts).toHaveLength(1);
    expect(db._auditInserts[0]).toMatchObject({
      action: "system.sla_breach",
      entityType: "incident",
      entityId: "inc-1",
      actorId: null,
    });
  });

  it("skips already-flagged tickets (idempotent)", async () => {
    const db = mockDb({ returning: [] });
    const processor = new SlaProcessor(
      db as never,
      mail as never,
      notifications as never,
    );
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
    const processor = new SlaProcessor(
      db as never,
      mail as never,
      notifications as never,
    );
    expect(
      await processor.flagBreach({
        id: "inc-2",
        title: "Late",
        priority: "P3",
        assignedTo: null,
        slaDueAt: new Date("2020-01-01"),
      }),
    ).toBe("flagged");

    const db2 = mockDb({ returning: [] });
    const processor2 = new SlaProcessor(
      db2 as never,
      mail as never,
      notifications as never,
    );
    expect(
      await processor2.flagBreach({
        id: "inc-2",
        title: "Late",
        priority: "P3",
        assignedTo: null,
        slaDueAt: new Date("2020-01-01"),
      }),
    ).toBe("skipped");
  });

  it("ignores unknown job names", async () => {
    const db = mockDb({});
    const processor = new SlaProcessor(
      db as never,
      mail as never,
      notifications as never,
    );
    await processor.process({ name: "other-job" } as never);
    expect(db.select).not.toHaveBeenCalled();
  });
});
