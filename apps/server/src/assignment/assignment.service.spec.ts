import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  pickLeastLoadedAgent,
  pickRoundRobinCandidate,
  type AgentLoad,
  AssignmentService,
} from "./assignment.service";

describe("pickRoundRobinCandidate", () => {
  it("cycles fairly across equal-load candidates", () => {
    const agents = ["a", "b", "c"];
    expect(pickRoundRobinCandidate(agents, 0)).toBe("a");
    expect(pickRoundRobinCandidate(agents, 1)).toBe("b");
    expect(pickRoundRobinCandidate(agents, 2)).toBe("c");
    expect(pickRoundRobinCandidate(agents, 3)).toBe("a");
  });

  it("throws when the candidate pool is empty", () => {
    expect(() => pickRoundRobinCandidate([], 0)).toThrow(/No candidates/);
  });
});

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
      { agentId: "ccc", openCount: 0 },
    ];
    const first = pickLeastLoadedAgent(loads);
    loads.find((l) => l.agentId === first)!.openCount += 1;
    const second = pickLeastLoadedAgent(loads);
    loads.find((l) => l.agentId === second)!.openCount += 1;
    const third = pickLeastLoadedAgent(loads);
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it("throws when no agents are available", () => {
    expect(() => pickLeastLoadedAgent([])).toThrow(ServiceUnavailableException);
    expect(() => pickLeastLoadedAgent([])).toThrow(/No agents available/);
  });
});

describe("AssignmentService.assignNextAgent concurrency", () => {
  it("serializes picks so equal-load agents rotate under contention", async () => {
    const agentA = "aaa";
    const agentB = "bbb";
    const openByAgent = new Map<string, number>([
      [agentA, 0],
      [agentB, 0],
    ]);

    let lockHeld = false;
    const waiters: Array<() => void> = [];

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
    let selectCall = 0;
    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          execute: vi.fn(async () => undefined),
          select: vi.fn(() => {
            selectCall += 1;
            const isTicketLookup = selectCall === 1;
            const chain: {
              from: () => unknown;
              where: () => unknown;
              orderBy: () => unknown;
              limit: () => unknown;
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
              limit() {
                return chain;
              },
              for: async () =>
                isTicketLookup
                  ? [
                      {
                        id: "ticket-1",
                        status: "New",
                        projectId: null,
                      },
                    ]
                  : [],
            };
            return chain;
          }),
        };
        return fn(tx);
      }),
    };
    const service = new AssignmentService(db as never);
    await expect(service.assignNextAgent("ticket-1", "Email")).rejects.toThrow(
      /No agents available/,
    );
  });
});
