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
  Submitted: ["Approved", "Scheduled", "Rolled Back"],
  PendingApproval: ["Approved", "Scheduled", "Rolled Back"],
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

export function canTransitionChange(
  currentDbOrApiStatus: string,
  nextApiStatus: string,
): boolean {
  const allowed =
    CHANGE_ALLOWED_TRANSITIONS[currentDbOrApiStatus] ?? [];
  return allowed.includes(nextApiStatus) || currentDbOrApiStatus === nextApiStatus;
}
