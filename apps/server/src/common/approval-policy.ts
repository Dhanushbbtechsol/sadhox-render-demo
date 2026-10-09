import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import type { UserRole } from "../common/types/roles";

export function assertAdminRole(role: string): void {
  if ((role as UserRole) !== "Admin") {
    const error = new Error("Admin role required");
    error.name = "ForbiddenException";
    throw error;
  }
}

export function isPendingServiceRequestStatus(status: string): boolean {
  return status === "Submitted" || status === "PendingApproval";
}

/** Agent/Admin fulfillment path after Admin approval. */
export const REQUEST_FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  Approved: ["InFulfillment"],
  InFulfillment: ["Fulfilled"],
};

export function canTransitionRequestFulfillment(
  currentStatus: string,
  nextStatus: "InFulfillment" | "Fulfilled",
): boolean {
  const allowed = REQUEST_FULFILLMENT_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(nextStatus);
}

export function assertAgentOrAdminRole(role: string): void {
  if (role !== "Admin" && role !== "Agent") {
    const error = new Error("Agent or Admin role required");
    error.name = "ForbiddenException";
    throw error;
  }
}

export const CHANGE_API_TO_DB_STATUS: Record<string, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  PendingApproval: "PendingApproval",
  Approved: "Approved",
  Scheduled: "Scheduled",
  Implemented: "Implemented",
  Closed: "Closed",
  "Rolled Back": "RolledBack",
};

/**
 * Generic PATCH transitions. Phase 8: Manager → PendingApproval; Admin final → Approved.
 * Submitted and PendingApproval may also move to Approved or Rolled Back when
 * ChangesService role checks pass. No schedule skip.
 */
export const CHANGE_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Submitted", "Rolled Back"],
  Submitted: ["PendingApproval", "Approved", "Rolled Back"],
  PendingApproval: ["Approved", "Rolled Back"],
  Approved: ["Scheduled", "Implemented", "Rolled Back"],
  Scheduled: ["Implemented", "Rolled Back"],
  Implemented: ["Closed", "Rolled Back"],
  Implementing: ["Closed", "Rolled Back"],
  Closed: [],
  "Rolled Back": [],
  Completed: [],
  Failed: [],
  Cancelled: [],
  RolledBack: [],
};

/** Statuses that may only be set by Admin (CAB schedule) via generic PATCH. */
export const CHANGE_ADMIN_GATED_STATUSES = new Set([
  "Scheduled",
  "Rolled Back",
  "Approved",
]);

export function requiresAdminForChangeStatus(nextApiStatus: string): boolean {
  return CHANGE_ADMIN_GATED_STATUSES.has(nextApiStatus);
}

export function canTransitionChange(
  currentDbOrApiStatus: string,
  nextApiStatus: string,
): boolean {
  const allowed =
    CHANGE_ALLOWED_TRANSITIONS[currentDbOrApiStatus] ?? [];
  return allowed.includes(nextApiStatus) || currentDbOrApiStatus === nextApiStatus;
}

/** Project always has manager_id NOT NULL; "no manager step" ⇒ null project_id. */
export function ticketHasManagerStep(
  projectId: string | null | undefined,
): boolean {
  return projectId != null && projectId !== "";
}

function isWaitingOnManagerStatus(
  status: string,
  allowDraft: boolean,
): boolean {
  if (status === "Submitted") return true;
  if (allowDraft && status === "Draft") return true;
  return false;
}

export type ApproveChainResult = {
  nextStatus: "PendingApproval" | "Approved";
  /** Set approver_id / approved_at only on final Admin approval. */
  setApproverFields: boolean;
};

/**
 * Phase 8 two-step approve. Ownership for Manager is checked separately
 * via ProjectAccessService.assertCanApprove.
 */
export function resolveApproveTransition(args: {
  role: string;
  currentStatus: string;
  projectId: string | null | undefined;
  /** Changes historically allow approve from Draft as well as Submitted. */
  allowDraft?: boolean;
}): ApproveChainResult {
  const allowDraft = args.allowDraft ?? false;
  const waiting = isWaitingOnManagerStatus(args.currentStatus, allowDraft);
  const pending = args.currentStatus === "PendingApproval";
  const hasManager = ticketHasManagerStep(args.projectId);

  if (args.role === "Manager") {
    if (pending) {
      throw new ForbiddenException(
        "Manager cannot final-approve; waiting on Admin",
      );
    }
    if (!waiting) {
      throw new BadRequestException(
        `Cannot approve a ticket in status ${args.currentStatus}`,
      );
    }
    return { nextStatus: "PendingApproval", setApproverFields: false };
  }

  if (args.role === "Admin") {
    if (pending) {
      return { nextStatus: "Approved", setApproverFields: true };
    }
    if (waiting) {
      if (hasManager) {
        throw new ForbiddenException(
          "Admin cannot approve while a project manager must act first",
        );
      }
      return { nextStatus: "Approved", setApproverFields: true };
    }
    throw new BadRequestException(
      `Cannot approve a ticket in status ${args.currentStatus}`,
    );
  }

  throw new ForbiddenException("Not allowed to approve");
}

/**
 * Phase 8 reject. Manager only on waiting statuses; Admin on PendingApproval
 * or on waiting when there is no project.
 */
export function resolveRejectTransition<
  TReject extends "Rejected" | "RolledBack",
>(args: {
  role: string;
  currentStatus: string;
  projectId: string | null | undefined;
  rejectStatus: TReject;
  allowDraft?: boolean;
}): { nextStatus: TReject; setApproverFields: boolean } {
  const allowDraft = args.allowDraft ?? false;
  const waiting = isWaitingOnManagerStatus(args.currentStatus, allowDraft);
  const pending = args.currentStatus === "PendingApproval";
  const hasManager = ticketHasManagerStep(args.projectId);

  if (args.role === "Manager") {
    if (pending) {
      throw new ForbiddenException(
        "Manager cannot reject after handing off to Admin",
      );
    }
    if (!waiting) {
      throw new BadRequestException(
        `Cannot reject a ticket in status ${args.currentStatus}`,
      );
    }
    return { nextStatus: args.rejectStatus, setApproverFields: true };
  }

  if (args.role === "Admin") {
    if (pending) {
      return { nextStatus: args.rejectStatus, setApproverFields: true };
    }
    if (waiting) {
      if (hasManager) {
        throw new ForbiddenException(
          "Admin cannot reject while a project manager must act first",
        );
      }
      return { nextStatus: args.rejectStatus, setApproverFields: true };
    }
    throw new BadRequestException(
      `Cannot reject a ticket in status ${args.currentStatus}`,
    );
  }

  throw new ForbiddenException("Not allowed to reject");
}
