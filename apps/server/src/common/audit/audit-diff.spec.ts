import { describe, expect, it } from "vitest";
import {
  buildAuditDiff,
  buildCommentDiff,
  createFieldChanges,
  deleteFieldChanges,
  diffFields,
  extractLabel,
  inferAuditEvent,
  pickAuditedSnapshot,
} from "./audit-diff";

describe("diffFields", () => {
  it("returns only changed scalar pairs", () => {
    expect(
      diffFields(
        { status: "New", priority: "P3", title: "A" },
        { status: "In Progress", priority: "P3", title: "A" },
      ),
    ).toEqual({
      status: { before: "New", after: "In Progress" },
    });
  });

  it("treats missing keys as null", () => {
    expect(diffFields({ assignedTo: null }, { assignedTo: "u1" })).toEqual({
      assignedTo: { before: null, after: "u1" },
    });
  });
});

describe("createFieldChanges / deleteFieldChanges", () => {
  it("creates with before null", () => {
    expect(createFieldChanges({ status: "New", title: "T" })).toEqual({
      status: { before: null, after: "New" },
      title: { before: null, after: "T" },
    });
  });

  it("deletes with after null", () => {
    expect(deleteFieldChanges({ name: "Laptop", status: "Active" })).toEqual({
      name: { before: "Laptop", after: null },
      status: { before: "Active", after: null },
    });
  });
});

describe("inferAuditEvent", () => {
  it("detects create, status, assign, comment, approve", () => {
    expect(inferAuditEvent("POST", "/incidents", {})).toBe("CREATED");
    expect(
      inferAuditEvent("PATCH", "/incidents/:id", {
        status: { before: "New", after: "Resolved" },
      }),
    ).toBe("STATUS_CHANGED");
    expect(
      inferAuditEvent("POST", "/incidents/:id/assign", {
        assignedTo: { before: null, after: "a1" },
      }),
    ).toBe("ASSIGNED");
    expect(
      inferAuditEvent("POST", "/incidents/:id/assign", {
        assignedTo: { before: "a1", after: "a2" },
      }),
    ).toBe("REASSIGNED");
    expect(inferAuditEvent("POST", "/incidents/:id/comments", {})).toBe(
      "COMMENT_ADDED",
    );
    expect(inferAuditEvent("PATCH", "/service-requests/:id/approve", {})).toBe(
      "APPROVED",
    );
    expect(inferAuditEvent("PATCH", "/changes/:id/reject", {})).toBe("REJECTED");
    expect(inferAuditEvent("DELETE", "/assets/:id", {})).toBe("DELETED");
  });
});

describe("pickAuditedSnapshot / extractLabel / buildAuditDiff", () => {
  it("picks allowlisted fields from response", () => {
    expect(
      pickAuditedSnapshot(
        {
          id: "x",
          title: "VPN",
          status: "New",
          description: "long",
          password: "nope",
        },
        ["title", "status"],
      ),
    ).toEqual({ title: "VPN", status: "New" });
  });

  it("flattens nested person snippets into *Name fields", () => {
    expect(
      pickAuditedSnapshot(
        {
          status: "Assigned",
          assignee: { id: "u1", name: "Alex Agent" },
          reporter: { name: "Sam Reporter" },
        },
        ["status", "assigneeName", "reporterName"],
      ),
    ).toEqual({
      status: "Assigned",
      assigneeName: "Alex Agent",
      reporterName: "Sam Reporter",
    });
  });

  it("builds comment pointer-only diff", () => {
    expect(buildCommentDiff("c1", { title: "Ticket" })).toEqual({
      event: "COMMENT_ADDED",
      title: "Ticket",
      commentId: { before: null, after: "c1" },
    });
  });

  it("buildAuditDiff merges event, label, changes", () => {
    const changes = diffFields({ status: "New" }, { status: "Closed" });
    expect(
      buildAuditDiff({
        event: "STATUS_CHANGED",
        label: extractLabel({ title: "Printer" }),
        changes,
      }),
    ).toEqual({
      event: "STATUS_CHANGED",
      title: "Printer",
      status: { before: "New", after: "Closed" },
    });
  });

  it("keeps label scalars when the same key is also a field change", () => {
    expect(
      buildAuditDiff({
        event: "CREATED",
        label: { title: "VPN" },
        changes: {
          title: { before: null, after: "VPN" },
          status: { before: null, after: "New" },
        },
      }),
    ).toEqual({
      event: "CREATED",
      title: "VPN",
      status: { before: null, after: "New" },
    });
  });
});
