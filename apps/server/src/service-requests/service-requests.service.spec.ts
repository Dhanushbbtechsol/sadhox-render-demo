import {
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ServiceRequestsService } from "./service-requests.service";

const SR_ID = "11111111-1111-4111-8111-111111111111";
const REQUESTER_ID = "22222222-2222-4222-8222-222222222222";
const MANAGER_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_MGR_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const PROJECT_ID = "66666666-6666-4666-8666-666666666666";

const manager = {
  userId: MANAGER_ID,
  email: "mgr@sadhox.local",
  role: "Manager" as const,
  name: "Manager",
};
const otherManager = {
  userId: OTHER_MGR_ID,
  email: "other@sadhox.local",
  role: "Manager" as const,
  name: "Other",
};
const admin = {
  userId: ADMIN_ID,
  email: "admin@sadhox.local",
  role: "Admin" as const,
  name: "Admin",
};
const requester = {
  userId: REQUESTER_ID,
  email: "eu@sadhox.local",
  role: "EndUser" as const,
  name: "EndUser",
};

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SR_ID,
    catalogId: "catalog-1",
    catalogName: "Laptop",
    requesterId: REQUESTER_ID,
    requesterName: "EndUser",
    requesterReportsToId: MANAGER_ID,
    status: "Submitted",
    justification: "need",
    urgency: "Medium",
    fields: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    approverId: null,
    approvedAt: null,
    rejectionReason: null,
    assigneeId: null,
    fulfillmentNotes: null,
    fulfilledAt: null,
    projectId: PROJECT_ID,
    projectName: "Proj",
    moduleId: null,
    moduleName: null,
    ...overrides,
  };
}

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SR_ID,
    catalogId: "catalog-1",
    requesterId: REQUESTER_ID,
    title: "Laptop",
    description: "need",
    justification: "need",
    urgency: "Medium",
    fields: {},
    status: "Submitted",
    approverId: null,
    approvedAt: null,
    rejectionReason: null,
    assigneeId: null,
    fulfillmentNotes: null,
    fulfilledAt: null,
    projectId: PROJECT_ID,
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Drizzle chain for listQuery().where().limit() used by get(). */
function createGetDb(row: ReturnType<typeof listRow> | null) {
  const limit = vi.fn(async () => (row ? [row] : []));
  const where = vi.fn(() => ({ limit }));
  const chain = { where, orderBy: vi.fn(), leftJoin: undefined as unknown };
  const leftJoin = vi.fn(() => chain);
  chain.leftJoin = leftJoin;
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin,
      })),
    })),
  };
  return { db, limit };
}

/**
 * requireExisting → select.from.where.limit
 * assertOrgApprover → select.from.where.limit (reportsToId)
 * update.set.where.returning
 * get() listQuery chain after success
 */
function createRejectDb(opts: {
  existing: ReturnType<typeof existingRow>;
  reportsToId: string | null;
  updateReturning: unknown[];
  getRow?: ReturnType<typeof listRow>;
}) {
  let selectN = 0;
  const whereUpdate = vi.fn(() => ({
    returning: vi.fn(async () => opts.updateReturning),
  }));
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

  const getLimit = vi.fn(async () => [
    opts.getRow ??
      listRow({
        status: "Rejected",
        requesterReportsToId: opts.reportsToId,
        projectId: opts.existing.projectId,
      }),
  ]);
  const getWhere = vi.fn(() => ({ limit: getLimit }));
  const getChain: { where: typeof getWhere; leftJoin: ReturnType<typeof vi.fn> } =
    {
      where: getWhere,
      leftJoin: vi.fn(),
    };
  getChain.leftJoin = vi.fn(() => getChain);

  const limit = vi.fn(async () => {
    selectN += 1;
    if (selectN === 1) return [opts.existing];
    if (selectN === 2) return [{ reportsToId: opts.reportsToId }];
    return [];
  });

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit })),
        leftJoin: vi.fn(() => getChain),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                title: "Laptop",
                email: "eu@sadhox.local",
                requesterId: REQUESTER_ID,
              },
            ]),
          })),
        })),
      })),
    })),
    update,
  };

  return { db, update, set, whereUpdate };
}

describe("ServiceRequestsService.get Manager read scope (Phase 9 reaudit)", () => {
  it("Manager outside the team → 403 (no project fallback)", async () => {
    const { db } = createGetDb(
      listRow({ requesterReportsToId: MANAGER_ID, projectId: PROJECT_ID }),
    );
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      {} as never,
      {} as never,
      projectAccess as never,
      {} as never,
    );
    await expect(service.get(otherManager, SR_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(projectAccess.assertCanViewTicket).not.toHaveBeenCalled();
  });

  it("requester's own manager → 200", async () => {
    const { db } = createGetDb(listRow({ requesterReportsToId: MANAGER_ID }));
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      {} as never,
      {} as never,
      projectAccess as never,
      {} as never,
    );
    const result = await service.get(manager, SR_ID);
    expect(result.id).toBe(SR_ID);
    expect(projectAccess.assertCanViewTicket).not.toHaveBeenCalled();
  });

  it("Admin → 200", async () => {
    const { db } = createGetDb(listRow({ requesterReportsToId: MANAGER_ID }));
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      {} as never,
      {} as never,
      projectAccess as never,
      {} as never,
    );
    const result = await service.get(admin, SR_ID);
    expect(result.id).toBe(SR_ID);
    expect(projectAccess.assertCanViewTicket).toHaveBeenCalled();
  });

  it("requester → 200", async () => {
    const { db } = createGetDb(listRow({ requesterId: REQUESTER_ID }));
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      {} as never,
      {} as never,
      projectAccess as never,
      {} as never,
    );
    const result = await service.get(requester, SR_ID);
    expect(result.id).toBe(SR_ID);
    expect(projectAccess.assertCanViewTicket).not.toHaveBeenCalled();
  });

  it("Manager who owns the project but is not reports_to → 403", async () => {
    const { db } = createGetDb(
      listRow({
        requesterReportsToId: MANAGER_ID,
        projectId: PROJECT_ID,
      }),
    );
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      {} as never,
      {} as never,
      projectAccess as never,
      {} as never,
    );
    await expect(service.get(otherManager, SR_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(projectAccess.assertCanViewTicket).not.toHaveBeenCalled();
  });
});

describe("ServiceRequestsService.reject follows nextApproval (Phase 9 reaudit)", () => {
  const mail = {
    sendRequestDecision: vi.fn().mockResolvedValue(undefined),
    sendRequestReviewRequest: vi.fn(),
  };
  const notifications = { record: vi.fn().mockResolvedValue(undefined) };

  function build(
    existing: ReturnType<typeof existingRow>,
    reportsToId: string | null,
    updateReturning: unknown[] = [{ ...existing, status: "Rejected" }],
  ) {
    const { db, update, set } = createRejectDb({
      existing,
      reportsToId,
      updateReturning,
    });
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ServiceRequestsService(
      db as never,
      mail as never,
      notifications as never,
      projectAccess as never,
      {} as never,
    );
    return { service, update, set, projectAccess };
  }

  it("Submitted with manager, actor is that manager → Rejected", async () => {
    const existing = existingRow({ status: "Submitted", projectId: PROJECT_ID });
    const { service, set } = build(existing, MANAGER_ID);
    const result = await service.reject(manager, SR_ID, { reason: "nope" });
    expect(result.status).toBe("Rejected");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Rejected",
        approverId: MANAGER_ID,
        rejectionReason: "nope",
      }),
    );
    expect(mail.sendRequestDecision).toHaveBeenCalled();
  });

  it("Submitted with manager, actor Admin → Rejected (may skip manager)", async () => {
    const existing = existingRow({ status: "Submitted" });
    const { service, set } = build(existing, MANAGER_ID);
    await expect(
      service.reject(admin, SR_ID, { reason: "nope" }),
    ).resolves.toBeTruthy();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Rejected",
        approverId: ADMIN_ID,
        rejectionReason: "nope",
      }),
    );
  });

  it("Submitted with no manager and a project, Admin rejects", async () => {
    const existing = existingRow({
      status: "Submitted",
      projectId: PROJECT_ID,
    });
    const { service, set } = build(existing, null);
    await expect(
      service.reject(admin, SR_ID, { reason: "nope" }),
    ).resolves.toBeTruthy();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Rejected" }),
    );
  });

  it("Submitted with no manager and no project, Admin rejects", async () => {
    const existing = existingRow({ status: "Submitted", projectId: null });
    const { service } = build(existing, null);
    await expect(
      service.reject(admin, SR_ID, { reason: "nope" }),
    ).resolves.toBeTruthy();
  });

  it("PendingApproval, Admin → Rejected", async () => {
    const existing = existingRow({ status: "PendingApproval" });
    const { service, set } = build(existing, MANAGER_ID);
    await expect(
      service.reject(admin, SR_ID, { reason: "nope" }),
    ).resolves.toBeTruthy();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Rejected", approverId: ADMIN_ID }),
    );
  });

  it("PendingApproval, Manager → 403", async () => {
    const existing = existingRow({ status: "PendingApproval" });
    const { service, update } = build(existing, MANAGER_ID);
    await expect(
      service.reject(manager, SR_ID, { reason: "nope" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it("Manager who is not the reports_to → 403", async () => {
    const existing = existingRow({ status: "Submitted" });
    const { service, update } = build(existing, MANAGER_ID);
    await expect(
      service.reject(otherManager, SR_ID, { reason: "nope" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it("concurrent reject returns 409 on the second", async () => {
    const existing = existingRow({ status: "Submitted" });
    const { service } = build(existing, MANAGER_ID, []); // empty = lost race
    await expect(
      service.reject(manager, SR_ID, { reason: "nope" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("Submitted with no manager and a project, Admin can also approve", async () => {
    const existing = existingRow({
      status: "Submitted",
      projectId: PROJECT_ID,
    });
    let selectN = 0;
    const whereUpdate = vi.fn(() => ({
      returning: vi.fn(async () => [{ ...existing, status: "Approved" }]),
    }));
    const set = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set }));
    const getChain: {
      where: ReturnType<typeof vi.fn>;
      leftJoin: ReturnType<typeof vi.fn>;
    } = {
      where: vi.fn(() => ({
        limit: vi.fn(async () => [
          listRow({
            status: "Approved",
            requesterReportsToId: null,
            projectId: PROJECT_ID,
          }),
        ]),
      })),
      leftJoin: vi.fn(),
    };
    getChain.leftJoin = vi.fn(() => getChain);
    const limit = vi.fn(async () => {
      selectN += 1;
      if (selectN === 1) return [existing];
      if (selectN === 2) return [{ reportsToId: null }];
      return [];
    });
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit })),
          leftJoin: vi.fn(() => getChain),
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  title: "Laptop",
                  email: "eu@sadhox.local",
                  requesterId: REQUESTER_ID,
                },
              ]),
            })),
          })),
        })),
      })),
      update,
    };
    const service = new ServiceRequestsService(
      db as never,
      mail as never,
      notifications as never,
      { assertCanViewTicket: vi.fn() } as never,
      {} as never,
    );
    const result = await service.approve(admin, SR_ID);
    expect(result.status).toBe("Approved");
  });
});
