import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { nextApproval } from "./approval-chain";

describe("nextApproval", () => {
  it("Submitted + manager + Manager → PendingApproval", () => {
    expect(
      nextApproval({
        status: "Submitted",
        actorRole: "Manager",
        hasManager: true,
      }),
    ).toBe("PendingApproval");
  });

  it("Submitted + manager + Admin → Forbidden", () => {
    expect(() =>
      nextApproval({
        status: "Submitted",
        actorRole: "Admin",
        hasManager: true,
      }),
    ).toThrow(ForbiddenException);
  });

  it("Submitted + no manager + Admin → Approved", () => {
    expect(
      nextApproval({
        status: "Submitted",
        actorRole: "Admin",
        hasManager: false,
      }),
    ).toBe("Approved");
  });

  it("PendingApproval + Admin → Approved", () => {
    expect(
      nextApproval({
        status: "PendingApproval",
        actorRole: "Admin",
        hasManager: true,
      }),
    ).toBe("Approved");
  });

  it("PendingApproval + Manager → Forbidden", () => {
    expect(() =>
      nextApproval({
        status: "PendingApproval",
        actorRole: "Manager",
        hasManager: true,
      }),
    ).toThrow(ForbiddenException);
  });
});
