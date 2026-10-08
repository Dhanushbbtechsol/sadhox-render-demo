import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateIncidentDto, UpdateIncidentDto } from "./incident.dto";

const validCreate = {
  title: "Cannot connect to VPN",
  description: "VPN client fails after password reset with timeout errors.",
  category: "Network & Connectivity",
  subcategory: "VPN Access",
  impact: "Medium",
  urgency: "High",
};

async function messagesFor(
  Cls: new () => object,
  body: unknown,
): Promise<string[]> {
  const value = plainToInstance(Cls, body);
  const errors = await validate(value as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe("CreateIncidentDto category/subcategory", () => {
  it("accepts a valid map pair", async () => {
    const errors = await messagesFor(CreateIncidentDto, validCreate);
    expect(errors).toEqual([]);
  });

  it("rejects an invalid pair", async () => {
    const errors = await messagesFor(CreateIncidentDto, {
      ...validCreate,
      category: "Hardware",
      subcategory: "VPN Access",
    });
    expect(errors.some((m) => /subcategory/i.test(m))).toBe(true);
  });

  it("rejects legacy Other on create", async () => {
    const errors = await messagesFor(CreateIncidentDto, {
      ...validCreate,
      category: "Hardware",
      subcategory: "Other",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects missing subcategory", async () => {
    const { subcategory: _omit, ...withoutSub } = validCreate;
    const errors = await messagesFor(CreateIncidentDto, withoutSub);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects old six-value categories like Email", async () => {
    const errors = await messagesFor(CreateIncidentDto, {
      ...validCreate,
      category: "Email",
      subcategory: "Email & Calendar",
    });
    expect(errors.some((m) => /category|Hardware|Collaboration/i.test(m))).toBe(
      true,
    );
  });
});

describe("UpdateIncidentDto category/subcategory (DTO layer)", () => {
  it("allows optional category/subcategory strings (pair checked in service)", async () => {
    const errors = await messagesFor(UpdateIncidentDto, {
      category: "Email",
      subcategory: "Other",
    });
    expect(errors).toEqual([]);
  });

  it("allows patch without category fields", async () => {
    const errors = await messagesFor(UpdateIncidentDto, {
      status: "InProgress",
    });
    expect(errors).toEqual([]);
  });
});
