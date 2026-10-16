import { describe, expect, it } from "vitest";

import { formatAuditAction, formatAuditDiff } from "./audit-activity";

describe("formatAuditAction", () => {
  it("maps HTTP paths to plain language (no METHOD /path)", () => {
    expect(
      formatAuditAction({
        action: "PATCH /incidents/6503d4c9-a32b-466e-818c-f389e6ea11e1",
        entityType: "incident",
      }),
    ).toBe("Updated a ticket");

    expect(
      formatAuditAction({
        action: "POST /incidents/6503d4c9-a32b-466e-818c-f389e6ea11e1/assign",
        entityType: "incident",
      }),
    ).toBe("Assigned a ticket");

    expect(
      formatAuditAction({
        action: "POST /problems",
        entityType: "problem",
      }),
    ).toBe("Created an issue");

    expect(
      formatAuditAction({
        action: "POST /problems -> 400",
        entityType: "problem",
      }),
    ).toBe("Created an issue (failed)");
  });

  it("maps system actions without HTTP", () => {
    expect(
      formatAuditAction({
        action: "auth.login_failed",
        entityType: "auth",
      }),
    ).toBe("Someone tried to sign in and failed");
  });
});

describe("formatAuditDiff", () => {
  it("returns [] for null or undefined", () => {
    expect(formatAuditDiff(null)).toEqual([]);
    expect(formatAuditDiff(undefined)).toEqual([]);
  });

  it("formats changed scalar keys from request → response", () => {
    expect(
      formatAuditDiff({
        request: { status: "Submitted", title: "Same" },
        response: { status: "Approved", title: "Same" },
      }),
    ).toEqual(["Status: Submitted → Approved"]);
  });

  it("returns [] when request and response match", () => {
    expect(
      formatAuditDiff({
        request: { status: "Submitted" },
        response: { status: "Submitted" },
      }),
    ).toEqual([]);
  });

  it("returns [] for failed or truncated diffs", () => {
    expect(formatAuditDiff({ outcome: "failed", status: 400 })).toEqual([]);
    expect(
      formatAuditDiff({ truncated: true, originalBytes: 9000, maxBytes: 8192 }),
    ).toEqual([]);
  });

  it("formats flat before/after pairs with human labels", () => {
    expect(
      formatAuditDiff({
        role: { before: "Agent", after: "Manager" },
      }),
    ).toEqual(["Role: Agent → Manager"]);
  });

  it("hides raw UUID foreign keys and prefers companion names", () => {
    expect(
      formatAuditDiff({
        status: { before: "Submitted", after: "Approved" },
        approverId: {
          before: null,
          after: "ab53831f-4dc9-408c-954b-f85df2edbc8a",
        },
        catalogId: {
          before: null,
          after: "11111111-1111-4111-8111-111111111111",
        },
        catalogName: { before: null, after: "Request Laptop" },
        requesterName: { before: null, after: "Sushmita" },
      }),
    ).toEqual([
      "Catalog: none → Request Laptop",
      "Requester: none → Sushmita",
      "Status: Submitted → Approved",
    ]);
  });

  it("omits UUID-only lines when no name companion exists", () => {
    expect(
      formatAuditDiff({
        status: { before: null, after: "Submitted" },
        catalogId: {
          before: null,
          after: "55555555-5555-4555-8555-555555555555",
        },
        requesterId: {
          before: null,
          after: "b58b5e69-7a91-4005-959f-5fe5d788b5b4",
        },
        urgency: { before: null, after: "Medium" },
      }),
    ).toEqual([
      "Status: none → Submitted",
      "Urgency: none → Medium",
    ]);
  });
});
