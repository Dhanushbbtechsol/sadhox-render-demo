import { describe, expect, it } from "vitest";
import type { AuthUser } from "../common/decorators/current-user.decorator";

/**
 * Pure ACL expectations for Phase 6 (mirrors ProjectAccessService rules).
 * Full DB integration is covered via seed + manual RBAC walkthrough.
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
  return role === "Admin";
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

  it("EndUser cannot use project lists", () => {
    expect(canAccessRole("EndUser", true)).toBe(false);
  });

  it("null-project tickets are Admin-only for staff roles", () => {
    expect(canSeeNullProject("Admin")).toBe(true);
    expect(canSeeNullProject("Manager")).toBe(false);
    expect(canSeeNullProject("Agent")).toBe(false);
    expect(canSeeNullProject("EndUser")).toBe(false);
  });
});
