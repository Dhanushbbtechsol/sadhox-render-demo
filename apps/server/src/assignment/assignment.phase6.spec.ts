import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AssignmentService } from "./assignment.service";

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
