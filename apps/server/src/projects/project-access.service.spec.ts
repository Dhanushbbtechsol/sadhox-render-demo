import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { ProjectAccessService } from "./project-access.service";

/**
 * Pure ACL expectations for Phase 6 (mirrors ProjectAccessService rules).
 */
function canAccessRole(
  role: AuthUser["role"],
  ownsOrMember: boolean,
): boolean {
  if (role === "Admin") return true;
  if (role === "Manager" || role === "Agent") return ownsOrMember;
  return false;
}

function canSeeNullProject(role: AuthUser["role"]): boolean {
  return role === "Admin" || role === "Agent";
}

describe("ProjectAccess rules", () => {
  it("Admin always accesses projects", () => {
    expect(canAccessRole("Admin", false)).toBe(true);
  });

  it("Manager only when owner", () => {
    expect(canAccessRole("Manager", true)).toBe(true);
    expect(canAccessRole("Manager", false)).toBe(false);
  });

  it("Agent only when member", () => {
    expect(canAccessRole("Agent", true)).toBe(true);
    expect(canAccessRole("Agent", false)).toBe(false);
  });

  it("EndUser cannot use project workspace ACL", () => {
    expect(canAccessRole("EndUser", true)).toBe(false);
  });

  it("null-project tickets: Admin + Agent (global pool); Manager denied", () => {
    expect(canSeeNullProject("Admin")).toBe(true);
    expect(canSeeNullProject("Agent")).toBe(true);
    expect(canSeeNullProject("Manager")).toBe(false);
    expect(canSeeNullProject("EndUser")).toBe(false);
  });
});

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
