export const EMAIL_JOB_TICKET_ASSIGNED = "email.ticket-assigned" as const;
export const EMAIL_JOB_SLA_BREACH = "email.sla-breach" as const;
export const EMAIL_JOB_APPROVAL_OUTCOME = "email.approval-outcome" as const;
/** Dev D Phase 3 Day 15 — asset notifications (Dev C). */
export const EMAIL_JOB_ASSET_NOTIFICATION =
  "email.asset-notification" as const;

export type TicketAssignedMailData = {
  ticketId: string;
  ticketTitle: string;
  assigneeName: string;
};

export type SlaBreachMailData = {
  ticketId: string;
  ticketTitle: string;
  priority: string;
  breachType: "response" | "resolve";
};

export type ApprovalOutcomeMailData = {
  entityType: "service-request" | "change";
  entityId: string;
  entityTitle: string;
  outcome: "approved" | "rejected";
  /** Optional rejection reason (service requests). */
  reason?: string;
};

export type AssetNotificationMailData = {
  assetId: string;
  assetTag: string;
  assetName: string;
  event: "owner_assigned" | "ticket_linked";
  /** Linked ticket id when event is ticket_linked. */
  ticketId?: string;
};

export type EmailJobPayload =
  | {
      kind: typeof EMAIL_JOB_TICKET_ASSIGNED;
      to: string;
      data: TicketAssignedMailData;
    }
  | {
      kind: typeof EMAIL_JOB_SLA_BREACH;
      to: string;
      data: SlaBreachMailData;
    }
  | {
      kind: typeof EMAIL_JOB_APPROVAL_OUTCOME;
      to: string;
      data: ApprovalOutcomeMailData;
    }
  | {
      kind: typeof EMAIL_JOB_ASSET_NOTIFICATION;
      to: string;
      data: AssetNotificationMailData;
    };

/** Mask email for logs: keep domain, hide local part. Never log full address. */
export function maskEmail(address: string): string {
  const at = address.indexOf("@");
  if (at <= 0 || at === address.length - 1) {
    return "[invalid-email]";
  }
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  const hint = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${hint}@${domain}`;
}

export function recipientDomain(address: string): string {
  const at = address.indexOf("@");
  if (at < 0 || at === address.length - 1) return "[unknown]";
  return address.slice(at + 1);
}
