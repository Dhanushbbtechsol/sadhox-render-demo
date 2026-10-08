import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  assertAdminRole,
  assertAgentOrAdminRole,
  canTransitionChange,
  canTransitionRequestFulfillment,
  isPendingServiceRequestStatus,
  requiresAdminForChangeStatus,
  resolveApproveTransition,
  resolveRejectTransition,
  ticketHasManagerStep,
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

  it("blocks Approved/Rolled Back via generic PATCH from Submitted/PendingApproval", () => {
    expect(canTransitionChange("Submitted", "Approved")).toBe(false);
    expect(canTransitionChange("Submitted", "Rolled Back")).toBe(false);
    expect(canTransitionChange("PendingApproval", "Approved")).toBe(false);
    expect(canTransitionChange("PendingApproval", "Rolled Back")).toBe(false);
    expect(canTransitionChange("Draft", "Submitted")).toBe(true);
    expect(canTransitionChange("Draft", "Rolled Back")).toBe(false);
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

describe("Phase 8 approve/reject chain", () => {
  it("treats null project_id as no manager step", () => {
    expect(ticketHasManagerStep(null)).toBe(false);
    expect(ticketHasManagerStep("proj")).toBe(true);
  });

  it("Manager: Submitted → PendingApproval; cannot final-approve", () => {
    expect(
      resolveApproveTransition({
        role: "Manager",
        currentStatus: "Submitted",
        projectId: "p1",
      }),
    ).toEqual({ nextStatus: "PendingApproval", setApproverFields: false });

    expect(() =>
      resolveApproveTransition({
        role: "Manager",
        currentStatus: "PendingApproval",
        projectId: "p1",
      }),
    ).toThrow(ForbiddenException);
  });

  it("Admin: PendingApproval → Approved; 403 on managed Submitted", () => {
    expect(
      resolveApproveTransition({
        role: "Admin",
        currentStatus: "PendingApproval",
        projectId: "p1",
      }),
    ).toEqual({ nextStatus: "Approved", setApproverFields: true });

    expect(() =>
      resolveApproveTransition({
        role: "Admin",
        currentStatus: "Submitted",
        projectId: "p1",
      }),
    ).toThrow(ForbiddenException);

    expect(
      resolveApproveTransition({
        role: "Admin",
        currentStatus: "Submitted",
        projectId: null,
      }),
    ).toEqual({ nextStatus: "Approved", setApproverFields: true });
  });

  it("Manager Draft approve (changes) → PendingApproval when project set", () => {
    expect(
      resolveApproveTransition({
        role: "Manager",
        currentStatus: "Draft",
        projectId: "p1",
        allowDraft: true,
      }),
    ).toEqual({ nextStatus: "PendingApproval", setApproverFields: false });
  });

  it("reject: Manager on Submitted; Admin on PendingApproval; Admin 403 on managed Submitted", () => {
    expect(
      resolveRejectTransition({
        role: "Manager",
        currentStatus: "Submitted",
        projectId: "p1",
        rejectStatus: "Rejected",
      }),
    ).toEqual({ nextStatus: "Rejected", setApproverFields: true });

    expect(
      resolveRejectTransition({
        role: "Admin",
        currentStatus: "PendingApproval",
        projectId: "p1",
        rejectStatus: "RolledBack",
      }),
    ).toEqual({ nextStatus: "RolledBack", setApproverFields: true });

    expect(() =>
      resolveRejectTransition({
        role: "Admin",
        currentStatus: "Submitted",
        projectId: "p1",
        rejectStatus: "Rejected",
      }),
    ).toThrow(ForbiddenException);

    expect(() =>
      resolveRejectTransition({
        role: "Manager",
        currentStatus: "PendingApproval",
        projectId: "p1",
        rejectStatus: "Rejected",
      }),
    ).toThrow(ForbiddenException);

    expect(() =>
      resolveApproveTransition({
        role: "Admin",
        currentStatus: "Approved",
        projectId: null,
      }),
    ).toThrow(BadRequestException);
  });

  /**
   * phase8.md reject table lists Submitted / PendingApproval only (no Draft).
   * Changes keep allowDraft on /reject (same as approve); SR has no Draft reject path.
   */
  it("Draft reject via resolveRejectTransition (Change allowDraft only)", () => {
    // Without allowDraft (SR-shaped): Draft is not rejectable
    expect(() =>
      resolveRejectTransition({
        role: "Manager",
        currentStatus: "Draft",
        projectId: "p1",
        rejectStatus: "Rejected",
      }),
    ).toThrow(BadRequestException);

    // Change-shaped: Manager may reject Draft on own project
    expect(
      resolveRejectTransition({
        role: "Manager",
        currentStatus: "Draft",
        projectId: "p1",
        rejectStatus: "RolledBack",
        allowDraft: true,
      }),
    ).toEqual({ nextStatus: "RolledBack", setApproverFields: true });

    // Admin: Draft with project → 403 (manager must act); null project → ok
    expect(() =>
      resolveRejectTransition({
        role: "Admin",
        currentStatus: "Draft",
        projectId: "p1",
        rejectStatus: "RolledBack",
        allowDraft: true,
      }),
    ).toThrow(ForbiddenException);

    expect(
      resolveRejectTransition({
        role: "Admin",
        currentStatus: "Draft",
        projectId: null,
        rejectStatus: "RolledBack",
        allowDraft: true,
      }),
    ).toEqual({ nextStatus: "RolledBack", setApproverFields: true });

    // Agent never
    expect(() =>
      resolveRejectTransition({
        role: "Agent",
        currentStatus: "Draft",
        projectId: "p1",
        rejectStatus: "RolledBack",
        allowDraft: true,
      }),
    ).toThrow(ForbiddenException);
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
