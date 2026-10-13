import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const lockfile = readFileSync(
  resolve(__dirname, "../../../../pnpm-lock.yaml"),
  "utf8",
);

describe("pnpm audit floors", () => {
  it("replaces the critical handlebars and tar versions", () => {
    expect(lockfile).toContain("handlebars@4.7.9: 4.7.10");
    expect(lockfile).toContain("tar@7.5.7: 7.5.22");
    expect(lockfile).not.toMatch(/^ {2}handlebars@4\.7\.9:\s*$/m);
    expect(lockfile).not.toMatch(/^ {2}tar@7\.5\.7:\s*$/m);
  });
});
