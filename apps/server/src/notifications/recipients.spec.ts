import { describe, expect, it } from "vitest";
import { recipientIds } from "./recipients";

describe("recipientIds", () => {
  it("sr.submitted notifies manager and admins", () => {
    expect(
      recipientIds({
        type: "sr.submitted",
        managerId: "mgr",
        adminIds: ["a1", "a2"],
      }),
    ).toEqual(["mgr", "a1", "a2"]);
  });

  it("sr.submitted falls back to admins when no manager", () => {
    expect(
      recipientIds({
        type: "sr.submitted",
        managerId: null,
        adminIds: ["a1", "a2"],
      }),
    ).toEqual(["a1", "a2"]);
  });

  it("comment.created excludes author", () => {
    expect(
      recipientIds({
        type: "comment.created",
        reporterId: "r1",
        assigneeId: "ag1",
        authorId: "r1",
      }),
    ).toEqual(["ag1"]);
  });

  it("incident.assigned includes assignee and reporter", () => {
    expect(
      recipientIds({
        type: "incident.assigned",
        assigneeId: "ag1",
        reporterId: "r1",
      }),
    ).toEqual(expect.arrayContaining(["ag1", "r1"]));
  });

  it("incident.resolved / closed → reporter only", () => {
    expect(
      recipientIds({ type: "incident.resolved", reporterId: "r1" }),
    ).toEqual(["r1"]);
    expect(
      recipientIds({ type: "incident.closed", reporterId: "r1" }),
    ).toEqual(["r1"]);
  });

  it("incident.p1_created → admins", () => {
    expect(
      recipientIds({
        type: "incident.p1_created",
        adminIds: ["a1"],
      }),
    ).toEqual(["a1"]);
  });
});
