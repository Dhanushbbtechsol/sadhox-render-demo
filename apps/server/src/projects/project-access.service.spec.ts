import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService", () => {
  it("Admin can always access", async () => {
    const svc = new ProjectAccessService({} as never);
    await expect(
      svc.canAccess(
        { userId: "a", email: "a@x", role: "Admin", name: "A" },
        "p1",
      ),
    ).resolves.toBe(true);
  });

  it("assertCanApprove allows Manager only for owned project", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "p1" }]),
          })),
        })),
      })),
    };
    const svc = new ProjectAccessService(db as never);
    await expect(
      svc.assertCanApprove(
        { userId: "m1", email: "m@x", role: "Manager", name: "M" },
        "p1",
      ),
    ).resolves.toBeUndefined();
  });

  it("assertCanApprove rejects Manager for null project", async () => {
    const svc = new ProjectAccessService({} as never);
    await expect(
      svc.assertCanApprove(
        { userId: "m1", email: "m@x", role: "Manager", name: "M" },
        null,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
