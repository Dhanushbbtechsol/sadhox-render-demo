import {
  assertAdminRole,
  assertAgentOrAdminRole,
  canTransitionChange,
  canTransitionRequestFulfillment,
  isPendingServiceRequestStatus,
  requiresAdminForChangeStatus,
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

  it("blocks Submitted → Scheduled skip (must Approve first)", () => {
    expect(canTransitionChange("Submitted", "Scheduled")).toBe(false);
    expect(canTransitionChange("PendingApproval", "Scheduled")).toBe(false);
    expect(canTransitionChange("Approved", "Scheduled")).toBe(true);
  });

  it("gates Approved, Scheduled, and Rolled Back as Admin-only statuses", () => {
    expect(requiresAdminForChangeStatus("Approved")).toBe(true);
    expect(requiresAdminForChangeStatus("Scheduled")).toBe(true);
    expect(requiresAdminForChangeStatus("Rolled Back")).toBe(true);
    expect(requiresAdminForChangeStatus("Implemented")).toBe(false);
    expect(requiresAdminForChangeStatus("Closed")).toBe(false);
    expect(requiresAdminForChangeStatus("Submitted")).toBe(false);
  });
});

describe("Phase 3 request fulfillment policy", () => {
  it("allows Agent/Admin for fulfillment roles", () => {
    expect(() => assertAgentOrAdminRole("Admin")).not.toThrow();
    expect(() => assertAgentOrAdminRole("Agent")).not.toThrow();
    expect(() => assertAgentOrAdminRole("EndUser")).toThrow(
      /Agent or Admin role required/,
    );
  });

  it("enforces Approved → InFulfillment → Fulfilled only", () => {
    expect(canTransitionRequestFulfillment("Approved", "InFulfillment")).toBe(
      true,
    );
    expect(canTransitionRequestFulfillment("InFulfillment", "Fulfilled")).toBe(
      true,
    );
    expect(canTransitionRequestFulfillment("Submitted", "InFulfillment")).toBe(
      false,
    );
    expect(canTransitionRequestFulfillment("Approved", "Fulfilled")).toBe(
      false,
    );
    expect(canTransitionRequestFulfillment("Rejected", "InFulfillment")).toBe(
      false,
    );
  });
});
