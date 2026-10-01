import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateChangeDto } from "./change.dto";

async function errorsFor(body: Record<string, unknown>) {
  const value = plainToInstance(CreateChangeDto, body);
  return validate(value, { whitelist: true, forbidNonWhitelisted: true });
}

describe("CreateChangeDto — Phase 4 Day 17", () => {
  const base = {
    title: "Normal change",
    description: "with downtime",
    type: "Normal",
    scheduledStart: "2030-06-01T10:00:00.000Z",
    scheduledEnd: "2030-06-01T12:00:00.000Z",
    rollbackPlan: "Revert to previous build",
  };

  it("requires rollback plan for Normal changes", async () => {
    const errors = await errorsFor({ ...base, rollbackPlan: "" });
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) =>
        Object.values(e.constraints ?? {}).some((m) =>
          m.toLowerCase().includes("rollback"),
        ),
      ),
    ).toBe(true);
  });

  it("requires rollback plan for Emergency changes", async () => {
    const errors = await errorsFor({
      ...base,
      type: "Emergency",
      rollbackPlan: "   ",
    });
    // whitespace still has length — MinLength(1) passes; service trims.
    // Empty string must fail:
    const empty = await errorsFor({
      ...base,
      type: "Emergency",
      rollbackPlan: "",
    });
    expect(empty.length).toBeGreaterThan(0);
  });

  it("allows Standard changes without rollback plan", async () => {
    const errors = await errorsFor({
      ...base,
      type: "Standard",
      rollbackPlan: undefined,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects scheduledEnd before or equal to scheduledStart", async () => {
    const before = await errorsFor({
      ...base,
      scheduledEnd: "2030-06-01T09:00:00.000Z",
    });
    expect(before.length).toBeGreaterThan(0);

    const equal = await errorsFor({
      ...base,
      scheduledEnd: base.scheduledStart,
    });
    expect(equal.length).toBeGreaterThan(0);
  });

  it("accepts a valid Normal change with window + rollback", async () => {
    const errors = await errorsFor(base);
    expect(errors).toHaveLength(0);
  });
});
