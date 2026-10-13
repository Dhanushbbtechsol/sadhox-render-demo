import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangesService } from "./changes.service";

const CREATOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MANAGER_ID = "mgrrrrrr-mgrr-4mgr-8mgr-mgrmgrmgrmgr";
const ADMIN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CHANGE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createApproveDb(
  existing: Record<string, unknown>,
  reportsToId: string | null,
  updateReturning: unknown[],
) {
  let selectN = 0;
  const whereUpdate = vi.fn(() => ({
    returning: vi.fn(async () => updateReturning),
  }));
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

  const mapped = {
    ...existing,
    status: (updateReturning[0] as { status?: string })?.status ?? existing.status,
    createdByName: "Agent",
    creatorReportsToId: reportsToId,
    projectName: null,
    moduleName: null,
    description: existing.description ?? "",
    rollbackPlan: existing.rollbackPlan ?? "",
    scheduledStart: existing.scheduledStart ?? new Date(),
    scheduledEnd: existing.scheduledEnd ?? new Date(),
    createdAt: existing.createdAt ?? new Date(),
  };

  const afterJoins = {
    where: vi.fn(() => ({
      limit: vi.fn(async () => [mapped]),
    })),
  };

  const limit = vi.fn(async () => {
    selectN += 1;
    if (selectN === 1) return [existing];
    if (selectN === 2) return [{ reportsToId }];
    return [{ email: "creator@sadhox.local" }];
  });

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit })),
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => afterJoins),
          })),
        })),
      })),
    })),
    update,
    set,
  };
  return { db, update, set };
}

function createProjectAccessMock() {
  return {
    assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    assertCanApprove: vi.fn().mockResolvedValue(undefined),
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

describe("ChangesService — Phase 9 org-chart approval", () => {
  const agent = {
    userId: CREATOR_ID,
    email: "agent@sadhox.local",
    role: "Agent" as const,
    name: "Agent",
  };
  const admin = {
    userId: ADMIN_ID,
    email: "admin@sadhox.local",
    role: "Admin" as const,
    name: "Admin",
  };
  const manager = {
    userId: MANAGER_ID,
    email: "mgr@sadhox.local",
    role: "Manager" as const,
    name: "Manager",
  };
  const endUser = {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    email: "user@sadhox.local",
    role: "EndUser" as const,
    name: "End User",
  };

  const submitted = {
    id: CHANGE_ID,
    title: "Change",
    description: "d",
    type: "Normal",
    status: "Submitted",
    scheduledStart: new Date("2030-01-01T10:00:00Z"),
    scheduledEnd: new Date("2030-01-01T12:00:00Z"),
    rollbackPlan: "rollback",
    createdBy: CREATOR_ID,
    approvedBy: null,
    projectId: null as string | null,
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const approved = { ...submitted, status: "Approved" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects Submitted → Scheduled as invalid transition (no approval skip)", async () => {
    const { db } = createApproveDb(submitted, MANAGER_ID, []);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, CHANGE_ID, { status: "Scheduled" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects Admin schedule after Approved (actions disabled)", async () => {
    const { db } = createApproveDb(approved, null, []);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(admin, CHANGE_ID, { status: "Scheduled" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects Agent transition to Approved via PATCH", async () => {
    const { db } = createApproveDb(submitted, null, []);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(agent, CHANGE_ID, { status: "Approved" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("Manager on Submitted with manager → PendingApproval", async () => {
    const { db, set } = createApproveDb(submitted, MANAGER_ID, [
      { ...submitted, status: "PendingApproval" },
    ]);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.approve(manager, CHANGE_ID);
    expect(result.status).toBe("PendingApproval");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PendingApproval" }),
    );
  });

  it("Admin on Submitted with manager → 403", async () => {
    const { db, update } = createApproveDb(submitted, MANAGER_ID, []);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(service.approve(admin, CHANGE_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("Admin on Submitted with no manager → Approved", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const { db } = createApproveDb(withProject, null, [
      { ...withProject, status: "Approved" },
    ]);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await service.approve(admin, CHANGE_ID);
    expect(result.status).toBe("Approved");
  });

  it("project manager who is not reports_to → 403", async () => {
    const withProject = { ...submitted, projectId: "proj-managed" };
    const { db, update } = createApproveDb(withProject, MANAGER_ID, []);
    const access = createProjectAccessMock();
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      access as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.approve(
        {
          userId: "other-mgr",
          email: "o@sadhox.local",
          role: "Manager",
          name: "Other",
        },
        CHANGE_ID,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
    expect(access.assertCanApprove).not.toHaveBeenCalled();
  });

  it("PendingApproval Manager → 403; Admin → Approved", async () => {
    const pending = { ...submitted, status: "PendingApproval" };
    const fail = createApproveDb(pending, MANAGER_ID, []);
    const failSvc = new ChangesService(
      fail.db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(failSvc.approve(manager, CHANGE_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const ok = createApproveDb(pending, MANAGER_ID, [
      { ...pending, status: "Approved" },
    ]);
    const okSvc = new ChangesService(
      ok.db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    const result = await okSvc.approve(admin, CHANGE_ID);
    expect(result.status).toBe("Approved");
  });

  it("PATCH Approved on Submitted with manager → 403 for Admin", async () => {
    const { db } = createApproveDb(submitted, MANAGER_ID, []);
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(admin, CHANGE_ID, { status: "Approved" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("Manager PATCH PendingApproval on Submitted when they are reports_to", async () => {
    const { db } = createApproveDb(submitted, MANAGER_ID, []);
    // update() doesn't use returning — just set
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(
      service.update(manager, CHANGE_ID, { status: "PendingApproval" }),
    ).resolves.toBeTruthy();
  });

  it("second concurrent approve gets ConflictException", async () => {
    const pending = { ...submitted, status: "PendingApproval" };
    const { db } = createApproveDb(pending, null, []); // empty returning
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn() } as never,
      { record: vi.fn() } as never,
      createProjectAccessMock() as never,
      createProjectsServiceMock() as never,
    );
    await expect(service.approve(admin, CHANGE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
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
  });

  it("EndUser create without project proceeds past resolver", async () => {
    const projectsService = createProjectsServiceMock();
    const service = new ChangesService(
      {
        transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            insert: vi.fn(() => ({
              values: vi.fn(() => ({
                onConflictDoUpdate: vi.fn(() => ({
                  returning: vi.fn(async () => [{ value: 1 }]),
                })),
                returning: vi.fn(async () => {
                  throw new Error("stop after resolve");
                }),
              })),
            })),
          };
          return fn(tx);
        }),
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
      }),
    ).rejects.toThrow("stop after resolve");
    expect(projectsService.resolveTicketProjectFields).toHaveBeenCalled();
  });
});
