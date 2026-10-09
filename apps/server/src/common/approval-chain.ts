import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

/**
 * Phase 9 two-step approval: requester's manager first, then Admin.
 * Admin cannot skip a manager. No manager → Admin one-step.
 */
export function nextApproval(input: {
  status: "Submitted" | "PendingApproval";
  actorRole: "Manager" | "Admin";
  hasManager: boolean;
}): "PendingApproval" | "Approved" {
  const { status, actorRole, hasManager } = input;

  if (status === "Submitted") {
    if (hasManager) {
      if (actorRole === "Manager") return "PendingApproval";
      throw new ForbiddenException(
        "Admin cannot skip manager approval when the requester has a manager",
      );
    }
    if (actorRole === "Admin") return "Approved";
    throw new ForbiddenException(
      "Only Admin can approve when the requester has no manager",
    );
  }

  if (status === "PendingApproval") {
    if (actorRole === "Admin") return "Approved";
    throw new ForbiddenException("Only Admin can final-approve");
  }

  throw new BadRequestException(`Cannot approve from status ${status}`);
}
