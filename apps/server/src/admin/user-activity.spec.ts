import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service";

const queues = [{} as never, {} as never, {} as never] as const;

function chain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

describe("AdminService.userActivityReport", () => {
  it("rejects unknown users", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })),
    };
    const svc = new AdminService(db as never, ...queues);
    await expect(
      svc.userActivityReport({ userId: "00000000-0000-4000-8000-000000000099" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects custom range without from/to", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "u1",
            name: "Eve",
            email: "eve@sadhox.local",
            role: "EndUser",
            reportsToId: null,
          },
        ]),
      })),
    };
    const svc = new AdminService(db as never, ...queues);
    // getUser succeeds; range validation fails before queries
    await expect(
      svc.userActivityReport({
        userId: "u1",
        range: "custom",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns sections for a valid preset window", async () => {
    const userRow = {
      id: "u1",
      referenceCode: "USR-000001",
      name: "Eve",
      email: "eve@sadhox.local",
      role: "EndUser",
      reportsToId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    let selectCalls = 0;
    const db = {
      select: vi.fn(() => {
        selectCalls += 1;
        if (selectCalls === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([userRow]),
          };
        }
        return chain([]);
      }),
    };
    const svc = new AdminService(db as never, ...queues);
    const report = await svc.userActivityReport({
      userId: "u1",
      range: "7d",
    });
    expect(report.user).toEqual({
      id: "u1",
      referenceCode: "USR-000001",
      name: "Eve",
      email: "eve@sadhox.local",
      role: "EndUser",
      reportsToId: null,
      reportsToName: null,
      reportsToEmail: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(report.range).toBe("7d");
    expect(report.ticketsReported).toEqual([]);
    expect(report.requests).toEqual([]);
    expect(report.changes).toEqual([]);
    expect(report.logs).toEqual([]);
    expect(report.assets).toEqual([]);
    expect(report.counts).toEqual({
      ticketsReported: 0,
      requests: 0,
      changes: 0,
      logs: 0,
      assets: 0,
    });
  });

  it("resolves audit entity UUIDs to reference codes", async () => {
    const userRow = {
      id: "u1",
      referenceCode: "USR-000001",
      name: "Eve",
      email: "eve@sadhox.local",
      role: "EndUser",
      reportsToId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const incidentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let selectCalls = 0;
    const db = {
      select: vi.fn(() => {
        selectCalls += 1;
        if (selectCalls === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([userRow]),
          };
        }
        // Parallel section queries: tickets, requests, changes, logs, assets
        if (selectCalls === 5) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([
              {
                id: "log-1",
                action: "PATCH /incidents/" + incidentId,
                entityType: "incidents",
                entityId: incidentId,
                createdAt: new Date("2026-01-02T00:00:00.000Z"),
              },
            ]),
          };
        }
        if (selectCalls >= 7) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([
              { id: incidentId, referenceCode: "INC-000042" },
            ]),
          };
        }
        return chain([]);
      }),
    };
    const svc = new AdminService(db as never, ...queues);
    const report = await svc.userActivityReport({
      userId: "u1",
      range: "7d",
    });
    expect(report.logs).toEqual([
      {
        id: "log-1",
        action: "PATCH /incidents/" + incidentId,
        entityType: "incidents",
        entityId: incidentId,
        referenceCode: "INC-000042",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });
});
