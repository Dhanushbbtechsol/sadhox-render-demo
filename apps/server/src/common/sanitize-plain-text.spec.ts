import { describe, expect, it } from "vitest";
import {
  sanitizeEmailSubjectPart,
  sanitizePlainText,
} from "./sanitize-plain-text";

describe("sanitizePlainText (comment XSS hardening)", () => {
  it("strips script tags and leaves readable text", () => {
    expect(sanitizePlainText('<script>alert("xss")</script>hello')).toBe(
      'alert("xss") hello',
    );
  });

  it("strips img onerror payloads", () => {
    expect(
      sanitizePlainText('<img src=x onerror="alert(1)">looks fine'),
    ).toBe("looks fine");
  });

  it("removes leftover angle brackets", () => {
    expect(sanitizePlainText("a < b > c")).toBe("a b c");
  });

  it("trims and collapses excessive blank lines", () => {
    expect(sanitizePlainText("  line1\n\n\n\nline2  ")).toBe("line1\n\nline2");
  });

  it("enforces max length", () => {
    expect(sanitizePlainText("abcdef", 4)).toBe("abcd");
  });

  it("drops null bytes and other controls", () => {
    expect(sanitizePlainText("ok\u0000bad\u0007")).toBe("okbad");
  });
});

describe("sanitizeEmailSubjectPart", () => {
  it("strips CR/LF header-injection attempts", () => {
    expect(
      sanitizeEmailSubjectPart("Laptop\r\nBcc: evil@example.com"),
    ).toBe("Laptop Bcc: evil@example.com");
  });

  it("collapses whitespace and enforces max length", () => {
    expect(sanitizeEmailSubjectPart("  hi\nthere  ", 5)).toBe("hi th");
  });
});
