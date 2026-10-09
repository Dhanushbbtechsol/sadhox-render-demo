import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service";

describe("AdminService.updateUserRole (Phase 6 promotion cleanup)", () => {
  it("promoting Agent → Manager deletes project_members in the same transaction", async () => {
    const deleted: string[] = [];
    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: vi.fn(() => ({
            from: () => ({
              where: () => ({
                limit: async () => [
                  {
                    id: "user-1",
                    email: "agent@x",
                    name: "Agent",
                    role: "Agent",
                    reportsToId: null,
                  },
                ],
              }),
            }),
          })),
          update: vi.fn(() => ({
            set: () => ({
              where: () => ({
                returning: async () => [
                  {
                    id: "user-1",
                    email: "agent@x",
                    name: "Agent",
                    role: "Manager",
                    reportsToId: null,
                  },
                ],
              }),
            }),
          })),
          delete: vi.fn(() => ({
            where: () => ({
              returning: async () => {
                deleted.push("proj-a", "proj-b");
                return [{ projectId: "proj-a" }, { projectId: "proj-b" }];
              },
            }),
          })),
        };
        return fn(tx);
      }),
    };

    const svc = new AdminService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await svc.updateUserRole("user-1", "Manager");
    expect(result.role).toBe("Manager");
    expect(result.previousRole).toBe("Agent");
    expect(result.membershipsRemoved).toBe(2);
    expect(deleted).toEqual(["proj-a", "proj-b"]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("demoting Manager → Agent does not touch project_members", async () => {
    const deleteFn = vi.fn();
    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: vi.fn(() => ({
            from: () => ({
              where: () => ({
                limit: async () => [
                  {
                    id: "user-1",
                    email: "mgr@x",
                    name: "Mgr",
                    role: "Manager",
                    reportsToId: null,
                  },
                ],
              }),
            }),
          })),
          update: vi.fn(() => ({
            set: () => ({
              where: () => ({
                returning: async () => [
                  {
                    id: "user-1",
                    email: "mgr@x",
                    name: "Mgr",
                    role: "Agent",
                    reportsToId: null,
                  },
                ],
              }),
            }),
          })),
          delete: deleteFn,
        };
        return fn(tx);
      }),
    };

    const svc = new AdminService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await svc.updateUserRole("user-1", "Agent");
    expect(result.role).toBe("Agent");
    expect(result.membershipsRemoved).toBe(0);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("404 when user missing", async () => {
    const db = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: vi.fn(() => ({
            from: () => ({
              where: () => ({
                limit: async () => [],
              }),
            }),
          })),
        };
        return fn(tx);
      }),
    };
    const svc = new AdminService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(svc.updateUserRole("missing", "Manager")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
