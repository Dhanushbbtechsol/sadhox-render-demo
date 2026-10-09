import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service";

const queues = [{} as never, {} as never, {} as never] as const;

describe("AdminService user CRUD (Phase 6)", () => {
  it("createUser returns public fields without passwordHash", async () => {
    const valuesFn = vi.fn(() => ({
      returning: vi.fn(async () => [
        {
          id: "u1",
          name: "New Agent",
          email: "agent@sadhox.local",
          role: "Agent",
          reportsToId: null,
        },
      ]),
    }));
    const db = {
      insert: vi.fn(() => ({ values: valuesFn })),
    };
    const svc = new AdminService(db as never, ...queues);
    const result = await svc.createUser({
      name: "New Agent",
      email: "Agent@Sadhox.Local",
      password: "ValidPass1!xx",
      role: "Agent",
    });
    expect(result).toEqual({
      id: "u1",
      name: "New Agent",
      email: "agent@sadhox.local",
      role: "Agent",
      reportsToId: null,
    });
    expect(result).not.toHaveProperty("passwordHash");
    const values = valuesFn.mock.calls[0]![0] as {
      email: string;
      passwordHash: string;
    };
    expect(values.email).toBe("agent@sadhox.local");
    expect(values.passwordHash).toMatch(/^\$2[aby]?\$/);
  });

  it("createUser rejects weak passwords", async () => {
    const svc = new AdminService({} as never, ...queues);
    await expect(
      svc.createUser({
        name: "X",
        email: "x@y.z",
        password: "short",
        role: "EndUser",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("createUser maps unique email to 409", async () => {
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => {
            const err = Object.assign(new Error("dup"), { code: "23505" });
            throw err;
          }),
        })),
      })),
    };
    const svc = new AdminService(db as never, ...queues);
    await expect(
      svc.createUser({
        name: "Dup",
        email: "dup@x.com",
        password: "ValidPass1!xx",
        role: "Agent",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("getUser 404 when missing", async () => {
    const db = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      })),
    };
    const svc = new AdminService(db as never, ...queues);
    await expect(svc.getUser("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updateUser promoting to Manager clears project_members", async () => {
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
                deleted.push("proj-a");
                return [{ projectId: "proj-a" }];
              },
            }),
          })),
        };
        return fn(tx);
      }),
    };
    const svc = new AdminService(db as never, ...queues);
    const result = await svc.updateUser("user-1", { role: "Manager" });
    expect(result.role).toBe("Manager");
    expect(result.membershipsRemoved).toBe(1);
    expect(deleted).toEqual(["proj-a"]);
  });

  it("updateUser rejects empty patch", async () => {
    const svc = new AdminService({} as never, ...queues);
    await expect(svc.updateUser("u1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
