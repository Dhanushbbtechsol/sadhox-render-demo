import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertReportsTo } from "./org-chart";

describe("assertReportsTo", () => {
  it("allows Manager as reports-to", () => {
    expect(() =>
      assertReportsTo("mgr-1", "user-1", "Manager"),
    ).not.toThrow();
  });

  it("allows Admin as reports-to", () => {
    expect(() =>
      assertReportsTo("admin-1", "user-1", "Admin"),
    ).not.toThrow();
  });

  it("rejects self-link", () => {
    expect(() => assertReportsTo("user-1", "user-1", "Manager")).toThrow(
      BadRequestException,
    );
  });

  it("rejects Agent / EndUser as reports-to", () => {
    expect(() => assertReportsTo("a1", "u1", "Agent")).toThrow(
      BadRequestException,
    );
    expect(() => assertReportsTo("e1", "u1", "EndUser")).toThrow(
      BadRequestException,
    );
  });
});
