import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangesService } from "./changes.service";

function createDbMock(
  existing: Record<string, unknown>,
  creatorReportsToId: string | null = null,
) {
  let selectCalls = 0;
  const whereUpdate = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

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
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            selectCalls += 1;
            // 1st: load change; later org-chart lookups return reportsToId
            if (selectCalls === 1) return [existing];
            return [{ reportsToId: creatorReportsToId }];
          }),
        })),
        leftJoin,
      })),
    })),
    update,
    set,
    whereUpdate,
  };
}

function createProjectAccessMock() {
  return {
    assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    assertCanApprove: vi.fn().mockImplementation(async (user: { role: string }) => {
      if (user.role !== "Admin" && user.role !== "Manager") {
        throw new ForbiddenException("Admin or Manager role required");
      }
    }),
    projectRequiresManagerStep: vi.fn(async (projectId: string | null) =>
      projectId != null && projectId !== "",
    ),
  };
}

function createProjectsServiceMock() {
  return {
    resolveTicketProjectFields: vi.fn().mockResolvedValue({
      projectId: null,
      moduleId: null,
    }),
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
  const manager = {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    email: "mgr@sadhox.local",
    role: "Manager" as const,
    name: "Manager",
  };
  const projectManager = {
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    email: "pm@sadhox.local",
    role: "Manager" as const,
    name: "ProjectMgr",
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
    projectId: null,
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const approved = { ...submitted, status: "Approved" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects Submitted → Scheduled as invalid transition (no approval skip)", async () => {
    const db = createDbMock(submitted);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
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
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
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
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, submitted.id as string, { status: "Approved" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects Agent Submitted → PendingApproval via PATCH", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const db = createDbMock(withProject);
    const access = createProjectAccessMock();
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      access as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, withProject.id as string, {
        status: "PendingApproval",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.assertCanApprove).not.toHaveBeenCalled();
  });

  it("rejects Admin Submitted → PendingApproval when creator has a manager (A04)", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const db = createDbMock(withProject, manager.userId);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(admin, withProject.id as string, {
        status: "PendingApproval",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects Admin Submitted → Approved when creator has manager and no project (A04)", async () => {
    const db = createDbMock(submitted, manager.userId);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(admin, submitted.id as string, { status: "Approved" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects project manager who is not reports_to_id from PendingApproval (A04)", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const db = createDbMock(withProject, manager.userId);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(projectManager, withProject.id as string, {
        status: "PendingApproval",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows creator reports_to_id Manager to set PendingApproval via PATCH", async () => {
    const db = createDbMock(submitted, manager.userId);
    let selectCalls = 0;
    db.select = vi.fn(() => {
      selectCalls += 1;
      if (selectCalls === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [submitted]),
            })),
          })),
        };
      }
      if (selectCalls === 2) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [{ reportsToId: manager.userId }]),
            })),
          })),
        };
      }
      const mapped = {
        ...submitted,
        status: "PendingApproval",
        createdByName: "Agent",
        description: "d",
        rollbackPlan: "rollback",
        scheduledStart: submitted.scheduledStart,
        scheduledEnd: submitted.scheduledEnd,
        createdAt: submitted.createdAt,
        projectId: null,
        projectName: null,
        moduleId: null,
        moduleName: null,
      };
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn(async () => [mapped]),
                })),
              })),
            })),
          })),
        })),
      };
    });
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.update(manager, submitted.id as string, {
      status: "PendingApproval",
    });
    expect(result.status).toBe("PendingApproval");
  });

  it("rejects Agent Rolled Back from Submitted (Admin rejection gate)", async () => {
    const db = createDbMock(submitted);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, submitted.id as string, { status: "Rolled Back" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows Admin to schedule after Approved", async () => {
    const db = createDbMock(approved);
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
      const mapped = {
        ...approved,
        status: "Scheduled",
        createdByName: "Admin",
        description: "d",
        rollbackPlan: "rollback",
        scheduledStart: approved.scheduledStart,
        scheduledEnd: approved.scheduledEnd,
        createdAt: approved.createdAt,
        projectId: null,
        projectName: null,
        moduleId: null,
        moduleName: null,
      };
      return {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn(async () => [mapped]),
                })),
              })),
            })),
          })),
        })),
      };
    });
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.update(admin, approved.id as string, {
      status: "Scheduled",
    });
    expect(result.status).toBe("Scheduled");
  });

  it("rejects Agent create with foreign projectId (A01/A04)", async () => {
    const projectsService = {
      resolveTicketProjectFields: vi
        .fn()
        .mockRejectedValue(new ForbiddenException("Cannot access this project")),
    };
    const service = new ChangesService(
      {} as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      projectsService as never,
    );
    await expect(
      service.create(agent, {
        title: "Change",
        description: "enough text here",
        type: "Normal",
        scheduledStart: "2030-01-01T10:00:00.000Z",
        scheduledEnd: "2030-01-01T12:00:00.000Z",
        rollbackPlan: "rollback plan text",
        projectId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
