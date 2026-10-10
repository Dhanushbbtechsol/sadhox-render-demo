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

describe("ChangesService — Admin-only approve, no actions", () => {
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
  const endUser = {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    email: "user@sadhox.local",
    role: "EndUser" as const,
    name: "End User",
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

  it("rejects Admin schedule after Approved (actions disabled)", async () => {
    const db = createDbMock(approved);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(admin, approved.id as string, { status: "Scheduled" }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, withProject.id as string, {
        status: "PendingApproval",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects Admin Submitted → PendingApproval (unused for changes)", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const db = createDbMock(withProject);
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
    ).rejects.toBeInstanceOf(BadRequestException);
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

  it("Admin can approve Submitted even when change has a project", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const returning = vi.fn(async () => [{ ...withProject, status: "Approved" }]);
    const whereUpdate = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set }));

    const mapped = {
      ...withProject,
      status: "Approved",
      createdByName: "Agent",
      projectName: "P",
      moduleName: null,
    };
    const afterJoins = {
      where: vi.fn(() => ({
        limit: vi.fn(async () => [mapped]),
      })),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [withProject]),
          })),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => afterJoins),
            })),
          })),
        })),
      })),
      update,
    };

    const service = new ChangesService(
      db as never,
      {
        sendApprovalOutcome: vi.fn().mockResolvedValue(undefined),
        sendChangeReviewRequest: vi.fn(),
      } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.approve(admin, withProject.id as string);
    expect(result.status).toBe("Approved");
  });

  it("allows Manager to approve a project change (Admin fallback)", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const returning = vi.fn(async () => [{ ...withProject, status: "Approved" }]);
    const whereUpdate = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set }));
    const mapped = {
      ...withProject,
      status: "Approved",
      createdByName: "Agent",
      projectName: "P",
      moduleName: null,
    };
    const afterJoins = {
      where: vi.fn(() => ({
        limit: vi.fn(async () => [mapped]),
      })),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [withProject]),
          })),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => afterJoins),
            })),
          })),
        })),
      })),
      update,
    };
    const access = createProjectAccessMock();
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      access as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.approve(
      {
        userId: "mgr",
        email: "mgr@sadhox.local",
        role: "Manager",
        name: "Mgr",
      },
      withProject.id as string,
    );
    expect(result.status).toBe("Approved");
    expect(access.assertCanApprove).toHaveBeenCalled();
  });

  it("rejects Agent create with foreign projectId (A01/A04)", async () => {
    const projectsService = {
      resolveTicketProjectFields: vi.fn().mockRejectedValue(
        new ForbiddenException("Cannot access this project"),
      ),
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
        title: "x",
        description: "y",
        type: "Standard",
        scheduledStart: "2030-01-01T10:00:00.000Z",
        scheduledEnd: "2030-01-01T12:00:00.000Z",
        rollbackPlan: "",
        projectId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(projectsService.resolveTicketProjectFields).toHaveBeenCalled();
  });

  it("rejects create without a project (Manager must be able to review)", async () => {
    const projectsService = createProjectsServiceMock();
    const service = new ChangesService(
      {} as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      projectsService as never,
    );
    await expect(
      service.create(endUser, {
        title: "User change",
        description: "please",
        type: "Standard",
        scheduledStart: "2030-01-01T10:00:00.000Z",
        scheduledEnd: "2030-01-01T12:00:00.000Z",
        rollbackPlan: "",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projectsService.resolveTicketProjectFields).toHaveBeenCalled();
  });

  it("EndUser create with project proceeds past resolver", async () => {
    const projectsService = {
      resolveTicketProjectFields: vi.fn().mockResolvedValue({
        projectId: "proj-1",
        moduleId: null,
      }),
    };
    const service = new ChangesService(
      {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(async () => {
              throw new Error("stop after resolve");
            }),
          })),
        })),
      } as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      projectsService as never,
    );
    await expect(
      service.create(endUser, {
        title: "User change",
        description: "please",
        type: "Standard",
        scheduledStart: "2030-01-01T10:00:00.000Z",
        scheduledEnd: "2030-01-01T12:00:00.000Z",
        rollbackPlan: "",
        projectId: "proj-1",
      }),
    ).rejects.toThrow("stop after resolve");
    expect(projectsService.resolveTicketProjectFields).toHaveBeenCalledWith(
      endUser,
      "proj-1",
      undefined,
    );
  });
});
