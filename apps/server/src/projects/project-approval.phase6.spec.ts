import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";

describe("Phase 6 Day 28 approval ACL", () => {
  const mgr = { userId: "mgr-1", role: "Manager" as const };
  const admin = { userId: "admin-1", role: "Admin" as const };

  it("Manager approves own project; 403 on other; 403 on null", async () => {
    const accessOwn = new ProjectAccessService({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "proj-own" }]),
          })),
        })),
      })),
    } as never);
    await expect(accessOwn.assertCanApprove(mgr, "proj-own")).resolves.toBe(
      undefined,
    );

    const accessOther = new ProjectAccessService({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      })),
    } as never);
    await expect(
      accessOther.assertCanApprove(mgr, "proj-other"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const accessNull = new ProjectAccessService({} as never);
    await expect(accessNull.assertCanApprove(mgr, null)).rejects.toThrow(
      /Null-project tickets require Admin/,
    );
  });

  it("Admin can approve null-project tickets", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(access.assertCanApprove(admin, null)).resolves.toBe(
      undefined,
    );
  });
});
