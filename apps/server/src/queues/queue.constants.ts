/** BullMQ queue name constants — keep in sync with QueuesModule registration. */
export const SLA_QUEUE = "sla-queue" as const;
export const TICKET_LIFECYCLE_QUEUE = "ticket-lifecycle-queue" as const;
export const EMAIL_QUEUE = "email-queue" as const;

export const SLA_EVALUATOR_JOB = "sla-breach-evaluator" as const;
export const TICKET_AUTOCLOSE_JOB = "ticket-autoclose" as const;

export const SLA_REPEAT_EVERY_MS = 5 * 60 * 1000;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: 100,
  // Keep a bounded window of failed jobs for inspection (not `true` / forever).
  removeOnFail: 1000,
};
