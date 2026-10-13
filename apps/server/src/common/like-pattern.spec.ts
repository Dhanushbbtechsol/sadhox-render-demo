import { describe, expect, it } from "vitest";
import { likeContains } from "./like-pattern";

describe("likeContains", () => {
  it("wraps a plain term and escapes LIKE wildcards", () => {
    expect(likeContains("vpn")).toBe("%vpn%");
    expect(likeContains("100%_cpu")).toBe("%100\\%\\_cpu%");
    expect(likeContains("a\\b")).toBe("%a\\\\b%");
  });
});
