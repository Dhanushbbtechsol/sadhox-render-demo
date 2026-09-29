import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  pickLeastLoadedAgent,
  type AgentLoad,
  AssignmentService,
} from "./assignment.service";

describe("pickLeastLoadedAgent", () => {
  it("picks the agent with the fewest open tickets", () => {
    const loads: AgentLoad[] = [
      { agentId: "a", openCount: 3 },
      { agentId: "b", openCount: 1 },
      { agentId: "c", openCount: 2 },
    ];
    expect(pickLeastLoadedAgent(loads)).toBe("b");
  });

  it("breaks ties by agentId (stable / sequential)", () => {
    const loads: AgentLoad[] = [
      { agentId: "ccc", openCount: 0 },
      { agentId: "aaa", openCount: 0 },
      { agentId: "bbb", openCount: 0 },
    ];
    expect(pickLeastLoadedAgent(loads)).toBe("aaa");
  });

  it("rotates fairly across repeated picks when loads are updated", () => {
    const loads: AgentLoad[] = [
      { agentId: "aaa", openCount: 0 },
      { agentId: "bbb", openCount: 0 },
    ];
    const first = pickLeastLoadedAgent(loads);
    expect(first).toBe("aaa");
    loads.find((l) => l.agentId === first)!.openCount += 1;
    const second = pickLeastLoadedAgent(loads);
    expect(second).toBe("bbb");
    loads.find((l) => l.agentId === second)!.openCount += 1;
    const third = pickLeastLoadedAgent(loads);
    expect(third).toBe("aaa");
  });

  it("throws a clear error when no agents exist", () => {
    expect(() => pickLeastLoadedAgent([])).toThrow(ServiceUnavailableException);
    expect(() => pickLeastLoadedAgent([])).toThrow(/No agents available/);
  });
});

describe("AssignmentService.assignNextAgent concurrency", () => {
  it("serializes concurrent calls so the same agent is not double-picked at equal load", async () => {
    const agentA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const agentB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let lockHeld = false;
    const waiters: Array<() => void> = [];
    const openByAgent = new Map<string, number>([
      [agentA, 0],
      [agentB, 0],
    ]);

    async function withLock<T>(fn: () => Promise<T>): Promise<T> {
      if (lockHeld) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
      lockHeld = true;
      try {
        return await fn();
      } finally {
        lockHeld = false;
        const next = waiters.shift();
        next?.();
      }
    }

    const picks: string[] = [];
    const assign = async (ticketId: string) =>
      withLock(async () => {
        const loads: AgentLoad[] = [
          { agentId: agentA, openCount: openByAgent.get(agentA)! },
          { agentId: agentB, openCount: openByAgent.get(agentB)! },
        ];
        const agentId = pickLeastLoadedAgent(loads);
        openByAgent.set(agentId, openByAgent.get(agentId)! + 1);
        picks.push(`${ticketId}:${agentId}`);
        return { agentId };
      });

    const results = await Promise.all([
      assign("t1"),
      assign("t2"),
      assign("t3"),
      assign("t4"),
    ]);

    const counts = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.agentId] = (acc[r.agentId] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts[agentA]).toBe(2);
    expect(counts[agentB]).toBe(2);
    expect(new Set(picks.map((p) => p.split(":")[0])).size).toBe(4);
  });

  it("propagates no-agents failure from the service transaction", async () => {
    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          execute: vi.fn(async () => undefined),
          select: vi.fn(() => {
            const chain: {
              from: () => unknown;
              where: () => unknown;
              orderBy: () => unknown;
              for: () => Promise<unknown[]>;
            } = {
              from() {
                return chain;
              },
              where() {
                return chain;
              },
              orderBy() {
                return chain;
              },
              for: async () => [],
            };
            return chain;
          }),
        };
        return fn(tx);
      }),
    };
    const service = new AssignmentService(db as never, {
      sendTicketAssigned: vi.fn().mockResolvedValue(undefined),
    } as never);
    await expect(service.assignNextAgent("ticket-1", "Email")).rejects.toThrow(
      /No agents available/,
    );
  });
});
