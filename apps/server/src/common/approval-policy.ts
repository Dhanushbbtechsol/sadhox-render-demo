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
  Approved: "Approved",
  Scheduled: "Scheduled",
  Implemented: "Implemented",
  Closed: "Closed",
  "Rolled Back": "RolledBack",
};

export const CHANGE_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Submitted", "Rolled Back"],
  // Approval required before schedule — no Submitted → Scheduled skip.
  Submitted: ["Approved", "Rolled Back"],
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

/** Statuses that may only be set by Admin (approval / CAB schedule gate). */
export const CHANGE_ADMIN_GATED_STATUSES = new Set(["Approved", "Scheduled"]);

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
