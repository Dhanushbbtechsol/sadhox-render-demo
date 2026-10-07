import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AssignmentService } from "./assignment.service";

const accessStub = { assertCanAccess: vi.fn().mockResolvedValue(undefined) };

describe("AssignmentService project pool (Phase 6 Day 28)", () => {
  it("uses project_members when ticket has project_id", async () => {
    const memberAgent = "agent-in-project";
    const queue: Array<() => unknown> = [
      () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              for: async () => [
                { id: "t1", status: "New", projectId: "proj-1" },
              ],
            }),
          }),
        }),
      }),
      () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                for: async () => [{ id: memberAgent }],
              }),
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

    const service = new AssignmentService(db as never, accessStub as never);
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
                limit: () => ({
                  for: async () => [
                    { id: "t1", status: "New", projectId: "proj-empty" },
                  ],
                }),
              }),
            }),
          }),
          () => ({
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    for: async () => [],
                  }),
                }),
              }),
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

    const service = new AssignmentService(makeDb() as never, accessStub as never);
    await expect(service.assignNextAgent("t1")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const service2 = new AssignmentService(
      makeDb() as never,
      accessStub as never,
    );
    await expect(service2.assignNextAgent("t1")).rejects.toThrow(
      /No project members available/,
    );
  });
});

describe("AssignmentService.listAgents project ACL (Phase 6 audit)", () => {
  const admin = {
    userId: "admin-1",
    email: "a@x",
    name: "Admin",
    role: "Admin" as const,
  };
  const agent = {
    userId: "agent-1",
    email: "ag@x",
    name: "Agent",
    role: "Agent" as const,
  };

  it("asserts project access when projectId is set", async () => {
    const assertCanAccess = vi.fn().mockResolvedValue(undefined);
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => []),
            })),
          })),
          where: vi.fn(() => ({
            groupBy: vi.fn(async () => []),
            orderBy: vi.fn(async () => []),
          })),
        })),
      })),
    };
    const service = new AssignmentService(db as never, {
      assertCanAccess,
    } as never);

    await service.listAgents(agent, "proj-1");
    expect(assertCanAccess).toHaveBeenCalledWith(agent, "proj-1");
  });

  it("skips assert when projectId omitted (global pool)", async () => {
    const assertCanAccess = vi.fn();
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => []),
            groupBy: vi.fn(async () => []),
          })),
        })),
      })),
    };
    const service = new AssignmentService(db as never, {
      assertCanAccess,
    } as never);

    await service.listAgents(admin);
    expect(assertCanAccess).not.toHaveBeenCalled();
  });

  it("propagates 403 when assertCanAccess denies foreign project", async () => {
    const assertCanAccess = vi
      .fn()
      .mockRejectedValue(new ForbiddenException("Cannot access this project"));
    const service = new AssignmentService({} as never, {
      assertCanAccess,
    } as never);

    await expect(
      service.listAgents(agent, "proj-foreign"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
