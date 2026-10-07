import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangesService } from "./changes.service";

function createDbMock(existing: Record<string, unknown>) {
  const limit = vi.fn(async () => [existing]);
  const whereSelect = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: whereSelect }));
  const select = vi.fn(() => ({ from }));

  const whereUpdate = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

  // get() after update — return mapped row via leftJoin chain
  const leftJoin = vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(async () => [
        {
          ...existing,
          createdByName: "Agent",
          description: existing.description ?? "",
          rollbackPlan: existing.rollbackPlan ?? "",
          scheduledStart: existing.scheduledStart ?? new Date(),
          scheduledEnd: existing.scheduledEnd ?? new Date(),
          createdAt: existing.createdAt ?? new Date(),
        },
      ]),
      orderBy: vi.fn(async () => []),
    })),
    orderBy: vi.fn(async () => []),
  }));

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: whereSelect,
        leftJoin,
      })),
    })),
    update,
    set,
    whereUpdate,
    _select: select,
  };
}

describe("ChangesService.update Admin gates", () => {
  const agent = {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "agent@sadhox.local",
    role: "Agent" as const,
    name: "Agent",
  };
  const admin = {
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    email: "admin@sadhox.local",
    role: "Admin" as const,
    name: "Admin",
  };

  const submitted = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Change",
    description: "d",
    type: "Normal",
    status: "Submitted",
    scheduledStart: new Date("2030-01-01T10:00:00Z"),
    scheduledEnd: new Date("2030-01-01T12:00:00Z"),
    rollbackPlan: "rollback",
    createdBy: agent.userId,
    approvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const approved = { ...submitted, status: "Approved" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects Submitted → Scheduled as invalid transition (no approval skip)", async () => {
    const db = createDbMock(submitted);
    const projectScope = {
      resolveTicketProjectScope: vi.fn(),
    };
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      projectScope as never,
      {
        listAccessibleProjectIds: vi.fn().mockResolvedValue([]),
        assertCanApprove: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
    await expect(
      service.update(agent, submitted.id as string, { status: "Scheduled" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects Agent transition to Scheduled even from Approved", async () => {
    const db = createDbMock(approved);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { resolveTicketProjectScope: vi.fn() } as never,
      {
        listAccessibleProjectIds: vi.fn().mockResolvedValue([]),
        assertCanApprove: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
    await expect(
      service.update(agent, approved.id as string, { status: "Scheduled" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects Agent transition to Approved via PATCH", async () => {
    const db = createDbMock(submitted);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { resolveTicketProjectScope: vi.fn() } as never,
      {
        listAccessibleProjectIds: vi.fn().mockResolvedValue([]),
        assertCanApprove: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
    await expect(
      service.update(agent, submitted.id as string, { status: "Approved" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects Agent Rolled Back from Submitted (Admin rejection gate)", async () => {
    const db = createDbMock(submitted);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { resolveTicketProjectScope: vi.fn() } as never,
      {
        listAccessibleProjectIds: vi.fn().mockResolvedValue([]),
        assertCanApprove: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
    await expect(
      service.update(agent, submitted.id as string, { status: "Rolled Back" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows Admin to schedule after Approved", async () => {
    const db = createDbMock(approved);
    // First select for existing, then get() after update
    let selectCalls = 0;
    db.select = vi.fn(() => {
      selectCalls += 1;
      if (selectCalls === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [approved]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  ...approved,
                  status: "Scheduled",
                  createdByName: "Admin",
                  description: "d",
                  rollbackPlan: "rollback",
                  scheduledStart: approved.scheduledStart,
                  scheduledEnd: approved.scheduledEnd,
                  createdAt: approved.createdAt,
                },
              ]),
            })),
          })),
        })),
      };
    }) as never;

    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { resolveTicketProjectScope: vi.fn() } as never,
      {
        listAccessibleProjectIds: vi.fn().mockResolvedValue([]),
        assertCanApprove: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
    const result = await service.update(admin, approved.id as string, {
      status: "Scheduled",
    });
    expect(result.status).toBe("Scheduled");
    expect(db.update).toHaveBeenCalled();
  });
});
