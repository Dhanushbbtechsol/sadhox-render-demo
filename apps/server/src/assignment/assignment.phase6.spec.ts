import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AssignmentService } from "./assignment.service";

describe("AssignmentService project pool (Phase 6 Day 28)", () => {
  it("uses project_members when ticket has project_id", async () => {
    const memberAgent = "agent-in-project";
    const queue: Array<() => unknown> = [
      () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "t1", projectId: "proj-1" }],
          }),
        }),
      }),
      () => ({
        from: () => ({
          where: async () => [{ userId: memberAgent }],
        }),
      }),
      () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              for: async () => [{ id: memberAgent }],
            }),
          }),
        }),
      }),
      () => ({
        from: () => ({
          where: () => ({
            groupBy: async () => [],
          }),
        }),
      }),
      () => ({
        from: () => ({
          where: () => ({
            groupBy: async () => [],
          }),
        }),
      }),
      () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              { id: memberAgent, email: "a@x", name: "Agent" },
            ],
          }),
        }),
      }),
      () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              for: async () => [{ id: "t1", status: "New" }],
            }),
          }),
        }),
      }),
    ];

    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          execute: vi.fn(async () => undefined),
          select: vi.fn(() => {
            const next = queue.shift();
            if (!next) throw new Error("unexpected select");
            return next();
          }),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(async () => undefined),
            })),
          })),
        };
        return fn(tx);
      }),
    };

    const service = new AssignmentService(db as never);
    const result = await service.assignNextAgent("t1");
    expect(result.id).toBe(memberAgent);
  });

  it("fails when project has no member Agents", async () => {
    const makeDb = () => ({
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const queue: Array<() => unknown> = [
          () => ({
            from: () => ({
              where: () => ({
                limit: async () => [{ id: "t1", projectId: "proj-empty" }],
              }),
            }),
          }),
          () => ({
            from: () => ({
              where: async () => [],
            }),
          }),
        ];
        const tx = {
          execute: vi.fn(async () => undefined),
          select: vi.fn(() => {
            const next = queue.shift();
            if (!next) throw new Error("unexpected select");
            return next();
          }),
        };
        return fn(tx);
      }),
    });

    const service = new AssignmentService(makeDb() as never);
    await expect(service.assignNextAgent("t1")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const service2 = new AssignmentService(makeDb() as never);
    await expect(service2.assignNextAgent("t1")).rejects.toThrow(
      /No project members available/,
    );
  });
});
