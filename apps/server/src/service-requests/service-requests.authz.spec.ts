import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ServiceRequestsService } from "./service-requests.service";

const manager = {
  userId: "manager-b",
  email: "mgr@sadhox.local",
  role: "Manager" as const,
  name: "Morgan",
};

const admin = {
  userId: "admin-1",
  email: "admin@sadhox.local",
  role: "Admin" as const,
  name: "Ian",
};

function serviceWithListRow(row: Record<string, unknown> | null) {
  const limit = vi.fn(async () => (row ? [row] : []));
  const query = {
    leftJoin: vi.fn(),
    where: vi.fn(() => ({ limit })),
  };
  query.leftJoin.mockReturnValue(query);
  const projectAccess = {
    assertCanViewTicket: vi.fn(async () => undefined),
  };
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => query),
    })),
  };
  const service = new ServiceRequestsService(
    db as never,
    {} as never,
    { record: vi.fn() } as never,
    projectAccess as never,
    {} as never,
  );
  return { service, projectAccess };
}

describe("ServiceRequestsService authz", () => {
  it("denies a manager who is not the requester's manager", async () => {
    const { service, projectAccess } = serviceWithListRow({
      requesterReportsToId: "manager-a",
      requesterId: "eve",
    });

    await expect(service.get(manager, "req-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(projectAccess.assertCanViewTicket).not.toHaveBeenCalled();
  });

  it("lets admin reject a submitted request that has a project and no line manager", async () => {
    const existing = {
      id: "req-1",
      status: "Submitted",
      requesterId: "user-1",
      projectId: "proj-1",
      title: "Laptop",
    };
    const mapped = {
      ...existing,
      status: "Rejected",
      referenceCode: "REQ-1",
      catalogId: "catalog-1",
      catalogName: "Laptop",
      requesterName: "Eve",
      requesterReportsToId: null,
      justification: "need",
      urgency: "Medium",
      fields: {},
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      approverId: admin.userId,
      approvedAt: new Date("2026-10-02T00:00:00.000Z"),
      rejectionReason: "no budget",
      assigneeId: null,
      fulfillmentNotes: null,
      fulfilledAt: null,
      projectName: "P",
      moduleId: null,
      moduleName: null,
    };
    const set = vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [mapped]),
      })),
    }));
    const joined = {
      leftJoin: vi.fn(),
      where: vi.fn(() => ({
        limit: vi.fn(async () => [mapped]),
      })),
    };
    joined.leftJoin.mockReturnValue(joined);

    let selectCalls = 0;
    const db = {
      select: vi.fn(() => {
        selectCalls += 1;
        if (selectCalls === 1) {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [existing],
              }),
            }),
          };
        }
        if (selectCalls === 2) {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{ reportsToId: null }],
              }),
            }),
          };
        }
        if (selectCalls === 3) {
          return {
            from: () => ({
              innerJoin: () => {
                throw new Error("mail lookup skipped");
              },
            }),
          };
        }
        return { from: () => joined };
      }),
      update: vi.fn(() => ({ set })),
    };

    const service = new ServiceRequestsService(
      db as never,
      { sendRequestDecision: vi.fn() } as never,
      { record: vi.fn() } as never,
      { assertCanViewTicket: vi.fn() } as never,
      {} as never,
    );

    const result = await service.reject(admin, existing.id, {
      reason: "no budget",
    });

    expect(result.status).toBe("Rejected");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Rejected", rejectionReason: "no budget" }),
    );
  });
});
