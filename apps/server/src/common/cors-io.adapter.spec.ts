import { describe, expect, it } from "vitest";
import { CorsIoAdapter, sharedCorsOptions } from "./cors-io.adapter";

describe("sharedCorsOptions", () => {
  it("aligns with HTTP CORS: concrete origin + credentials", () => {
    expect(sharedCorsOptions("http://localhost:5173")).toEqual({
      origin: "http://localhost:5173",
      credentials: true,
    });
  });

  it("whitelists a concrete production frontend origin (not *)", () => {
    const prod = "https://sadhox.vercel.app";
    expect(sharedCorsOptions(prod)).toEqual({
      origin: prod,
      credentials: true,
    });
  });

  it("fails closed on missing or wildcard origin", () => {
    expect(() => sharedCorsOptions("")).toThrow(/required/i);
    expect(() => sharedCorsOptions("   ")).toThrow(/required/i);
    expect(() => sharedCorsOptions("*")).toThrow(/\*/);
  });
});

describe("CorsIoAdapter", () => {
  it("uses the ConfigService-supplied origin, not process.env", () => {
    const previous = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = "http://env-should-not-win.example";
    try {
      const configured = "http://localhost:5173";
      // Minimal stand-in: constructor only needs an app-like object for IoAdapter.
      const app = { getHttpServer: () => undefined } as never;
      const adapter = new CorsIoAdapter(app, configured);
      expect(adapter.getCorsOrigin()).toBe(configured);
      expect(adapter.getCorsOrigin()).not.toBe(process.env.CORS_ORIGIN);
    } finally {
      if (previous === undefined) {
        delete process.env.CORS_ORIGIN;
      } else {
        process.env.CORS_ORIGIN = previous;
      }
    }
  });
});
