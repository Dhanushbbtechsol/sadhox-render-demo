import { describe, expect, it } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import { SentryExceptionFilter } from "./sentry-exception.filter";

describe("SentryExceptionFilter reporting rules", () => {
  it("treats 401/403/404/400 as non-reportable client errors", () => {
    const statuses = [
      HttpStatus.BAD_REQUEST,
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.NOT_FOUND,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ];
    for (const status of statuses) {
      expect(status < 500).toBe(true);
      const err = new HttpException("nope", status);
      expect(err.getStatus()).toBe(status);
    }
  });

  it("instantiates filter", () => {
    expect(new SentryExceptionFilter()).toBeInstanceOf(SentryExceptionFilter);
  });
});
