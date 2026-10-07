import { describe, expect, it, vi } from "vitest";
import { UnrecoverableError } from "bullmq";
import type { Job } from "bullmq";
import { buildEmailJobId, MailService } from "./mail.service";
import { EmailProcessor, throwFromResendError } from "./email.processor";
import { escapeHtml } from "./html-escape";
import {
  EMAIL_JOB_APPROVAL_OUTCOME,
  EMAIL_JOB_ASSET_NOTIFICATION,
  EMAIL_JOB_CHANGE_REVIEW,
  EMAIL_JOB_REQUEST_DECISION,
  EMAIL_JOB_REQUEST_REVIEW,
  EMAIL_JOB_SLA_BREACH,
  EMAIL_JOB_TICKET_ASSIGNED,
  maskEmail,
  type EmailJobPayload,
} from "./mail.types";

describe("maskEmail", () => {
  it("masks local part and keeps domain", () => {
    expect(maskEmail("admin@sadhox.local")).toBe("a***@sadhox.local");
  });
});

describe("escapeHtml", () => {
  it("escapes script tags in ticket titles for HTML templates", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });
});

describe("throwFromResendError", () => {
  it("throws UnrecoverableError for permanent 4xx validation errors", () => {
    expect(() =>
      throwFromResendError({
        message: "Invalid from address",
        statusCode: 422,
        name: "validation_error",
      }),
    ).toThrow(UnrecoverableError);
  });

  it("throws retryable Error for rate limits", () => {
    expect(() =>
      throwFromResendError({ message: "rate limited", statusCode: 429 }),
    ).toThrow(Error);
    try {
      throwFromResendError({ message: "rate limited", statusCode: 429 });
    } catch (e) {
      expect(e).not.toBeInstanceOf(UnrecoverableError);
    }
  });
});

describe("MailService enqueue", () => {
  it("sendTicketAssigned enqueues email-queue job without calling Resend", async () => {
    const add = vi.fn().mockResolvedValue({ id: "1" });
    const service = new MailService({ add } as never);
    await service.sendTicketAssigned("agent@example.com", {
      ticketId: "11111111-1111-1111-1111-111111111111",
      ticketTitle: "Laptop",
      assigneeName: "Alice",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_TICKET_ASSIGNED,
      expect.objectContaining({
        kind: EMAIL_JOB_TICKET_ASSIGNED,
        to: "agent@example.com",
        data: expect.objectContaining({ ticketTitle: "Laptop" }),
      }),
      expect.any(Object),
    );
  });

  it("sendSlaBreach enqueues email-queue job", async () => {
    const add = vi.fn().mockResolvedValue({ id: "2" });
    const service = new MailService({ add } as never);
    await service.sendSlaBreach("admin@example.com", {
      ticketId: "11111111-1111-1111-1111-111111111111",
      ticketTitle: "Outage",
      priority: "P1",
      breachType: "response",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_SLA_BREACH,
      expect.objectContaining({ kind: EMAIL_JOB_SLA_BREACH }),
      expect.objectContaining({
        jobId: expect.not.stringContaining(":"),
      }),
    );
  });

  it("buildEmailJobId never emits BullMQ-forbidden colons", () => {
    const id = buildEmailJobId(
      EMAIL_JOB_SLA_BREACH,
      "11111111-1111-1111-1111-111111111111",
      "resolve",
      "admin@example.com",
    );
    expect(id).not.toContain(":");
    expect(id).toContain("|");
  });

  it("sendRequestDecision enqueues approval/rejection email", async () => {
    const add = vi.fn().mockResolvedValue({ id: "3" });
    const service = new MailService({ add } as never);
    await service.sendRequestDecision("user@example.com", {
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestTitle: "Laptop",
      decision: "Approved",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_REQUEST_DECISION,
      expect.objectContaining({
        kind: EMAIL_JOB_REQUEST_DECISION,
        to: "user@example.com",
      }),
      expect.any(Object),
    );
  });

  it("sendRequestDecision enqueues Fulfilled confirmation", async () => {
    const add = vi.fn().mockResolvedValue({ id: "3b" });
    const service = new MailService({ add } as never);
    await service.sendRequestDecision("user@example.com", {
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestTitle: "Laptop",
      decision: "Fulfilled",
      reason: "Delivered",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_REQUEST_DECISION,
      expect.objectContaining({
        data: expect.objectContaining({ decision: "Fulfilled" }),
      }),
      expect.any(Object),
    );
  });

  it("sendRequestReviewRequest enqueues admin approval notification", async () => {
    const add = vi.fn().mockResolvedValue({ id: "3c" });
    const service = new MailService({ add } as never);
    await service.sendRequestReviewRequest("admin@example.com", {
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      requestTitle: "Request Laptop",
      submitterName: "End User",
      urgency: "High",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_REQUEST_REVIEW,
      expect.objectContaining({ kind: EMAIL_JOB_REQUEST_REVIEW }),
      expect.any(Object),
    );
  });

  it("sendChangeReviewRequest enqueues admin review email", async () => {
    const add = vi.fn().mockResolvedValue({ id: "4" });
    const service = new MailService({ add } as never);
    await service.sendChangeReviewRequest("admin@example.com", {
      changeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      changeTitle: "Firewall upgrade",
      submitterName: "Alice Agent",
      changeType: "Normal",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_CHANGE_REVIEW,
      expect.objectContaining({ kind: EMAIL_JOB_CHANGE_REVIEW }),
      expect.any(Object),
    );
  });

  it("sendApprovalOutcome enqueues email-queue job", async () => {
    const add = vi.fn().mockResolvedValue({ id: "5" });
    const service = new MailService({ add } as never);
    await service.sendApprovalOutcome("user@example.com", {
      entityType: "service-request",
      entityId: "11111111-1111-1111-1111-111111111111",
      entityTitle: "Laptop request",
      outcome: "approved",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_APPROVAL_OUTCOME,
      expect.objectContaining({
        kind: EMAIL_JOB_APPROVAL_OUTCOME,
        to: "user@example.com",
        data: expect.objectContaining({ outcome: "approved" }),
      }),
      expect.any(Object),
    );
  });

  it("sendAssetNotification enqueues email-queue job", async () => {
    const add = vi.fn().mockResolvedValue({ id: "6" });
    const service = new MailService({ add } as never);
    await service.sendAssetNotification("owner@example.com", {
      assetId: "11111111-1111-1111-1111-111111111111",
      assetTag: "LAP-001",
      assetName: "Laptop",
      event: "owner_assigned",
    });
    expect(add).toHaveBeenCalledWith(
      EMAIL_JOB_ASSET_NOTIFICATION,
      expect.objectContaining({
        kind: EMAIL_JOB_ASSET_NOTIFICATION,
        to: "owner@example.com",
        data: expect.objectContaining({ event: "owner_assigned" }),
      }),
      expect.any(Object),
    );
  });
});

describe("EmailProcessor", () => {
  const payload: EmailJobPayload = {
    kind: EMAIL_JOB_TICKET_ASSIGNED,
    to: "agent@example.com",
    data: {
      ticketId: "11111111-1111-1111-1111-111111111111",
      ticketTitle: "Laptop",
      assigneeName: "Alice",
    },
  };

  function buildProcessor(env: Record<string, string | undefined>) {
    const config = {
      get: vi.fn((key: string) => env[key]),
    };
    return new EmailProcessor(config as never);
  }

  it("dry-runs when RESEND_API_KEY is missing (no Resend call)", async () => {
    const processor = buildProcessor({
      NODE_ENV: "development",
      RESEND_API_KEY: undefined,
      MAIL_FROM: undefined,
    });
    const send = vi.fn();
    processor.createResendClient = vi.fn(() => ({
      emails: { send },
    })) as never;

    await processor.process({ id: "j1", data: payload } as Job<EmailJobPayload>);
    expect(processor.createResendClient).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends via mocked Resend when API key is set", async () => {
    const processor = buildProcessor({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test_key",
      MAIL_FROM: "noreply@sadhox.local",
    });
    const send = vi.fn().mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });
    processor.createResendClient = vi.fn(() => ({
      emails: { send },
    })) as never;

    await processor.process({ id: "j2", data: payload } as Job<EmailJobPayload>);
    expect(processor.createResendClient).toHaveBeenCalledWith("re_test_key");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@sadhox.local",
        to: "agent@example.com",
        subject: expect.stringContaining("Ticket assigned"),
      }),
    );
  });

  it("throws when mocked SDK returns { data: null, error } so BullMQ retries", async () => {
    const processor = buildProcessor({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test_key",
      MAIL_FROM: "noreply@sadhox.local",
    });
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rate limited", statusCode: 429 },
    });
    processor.createResendClient = vi.fn(() => ({
      emails: { send },
    })) as never;

    await expect(
      processor.process({ id: "j3", data: payload } as Job<EmailJobPayload>),
    ).rejects.toThrow(/rate limited/);

    const reporter = vi.fn();
    processor.setFailureReporter(reporter);
    processor.onFailed(
      {
        id: "j3",
        data: payload,
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as Job<EmailJobPayload>,
      new Error("rate limited"),
    );
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: EMAIL_JOB_TICKET_ASSIGNED,
        toMasked: "a***@example.com",
        domain: "example.com",
      }),
    );
  });

  it("uses UnrecoverableError for permanent 4xx Resend errors", async () => {
    const processor = buildProcessor({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test_key",
      MAIL_FROM: "noreply@sadhox.local",
    });
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Invalid to address",
        statusCode: 422,
        name: "validation_error",
      },
    });
    processor.createResendClient = vi.fn(() => ({
      emails: { send },
    })) as never;

    await expect(
      processor.process({ id: "j4", data: payload } as Job<EmailJobPayload>),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it("escapes script tags in ticket titles via React Email templates", async () => {
    const processor = buildProcessor({ NODE_ENV: "test" });
    const built = await processor.buildTemplate({
      kind: EMAIL_JOB_TICKET_ASSIGNED,
      to: "a@b.com",
      data: {
        ticketId: "11111111-1111-1111-1111-111111111111",
        ticketTitle: "<script>alert(1)</script>",
        assigneeName: "Alice",
      },
    });
    expect(built.html).toContain("&lt;script&gt;");
    expect(built.html).not.toContain("<script>alert(1)</script>");
  });
});
