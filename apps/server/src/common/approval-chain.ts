import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

/**
 * Org-chart approval: requester's manager may advance Submitted → PendingApproval.
 * Admin may final-approve at any step (Submitted or PendingApproval), including
 * when a manager exists — Admin is never blocked by the manager queue.
 * No manager → only Admin can approve (one-step).
 */
export function nextApproval(input: {
  status: "Submitted" | "PendingApproval";
  actorRole: "Manager" | "Admin";
  hasManager: boolean;
}): "PendingApproval" | "Approved" {
  const { status, actorRole, hasManager } = input;

  if (status === "Submitted") {
    if (actorRole === "Admin") return "Approved";
    if (actorRole === "Manager") {
      if (!hasManager) {
        throw new ForbiddenException(
          "Only Admin can approve when the requester has no manager",
        );
      }
      return "PendingApproval";
    }
  }

  if (status === "PendingApproval") {
    if (actorRole === "Admin") return "Approved";
    throw new ForbiddenException("Only Admin can final-approve");
  }

  throw new BadRequestException(`Cannot approve from status ${status}`);
}
