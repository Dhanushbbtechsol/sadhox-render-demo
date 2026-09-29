export const EMAIL_JOB_TICKET_ASSIGNED = "email.ticket-assigned" as const;
export const EMAIL_JOB_SLA_BREACH = "email.sla-breach" as const;

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
