import {
  assertAdminRole,
  canTransitionChange,
  isPendingServiceRequestStatus,
} from "./approval-policy";

describe("Phase 2 approval policy", () => {
  it("allows only Admin to approve", () => {
    expect(() => assertAdminRole("Admin")).not.toThrow();
    expect(() => assertAdminRole("Agent")).toThrow(/Admin role required/);
    expect(() => assertAdminRole("EndUser")).toThrow(/Admin role required/);
  });

  it("treats Submitted/PendingApproval as pending service requests", () => {
    expect(isPendingServiceRequestStatus("Submitted")).toBe(true);
    expect(isPendingServiceRequestStatus("PendingApproval")).toBe(true);
    expect(isPendingServiceRequestStatus("Approved")).toBe(false);
  });

  it("enforces change status transitions including reject from Submitted", () => {
    expect(canTransitionChange("Submitted", "Approved")).toBe(true);
    expect(canTransitionChange("Submitted", "Rolled Back")).toBe(true);
    expect(canTransitionChange("Draft", "Submitted")).toBe(true);
    expect(canTransitionChange("Closed", "Approved")).toBe(false);
  });
});
