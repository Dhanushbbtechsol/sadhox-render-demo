import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminService } from "./admin.service";

describe("AdminService.createUser", () => {
  it("rejects a duplicate email before insert", async () => {
    const db = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "existing" }],
          }),
        }),
      })),
      insert: vi.fn(),
    };
    const svc = new AdminService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      svc.createUser({
        name: "Ada",
        email: "ada@sadhox.local",
        password: "ValidPass1!xx",
        role: "Agent",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
