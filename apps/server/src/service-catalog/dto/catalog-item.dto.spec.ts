import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  CATALOG_OPTION_MAX_LENGTH,
  CATALOG_OPTIONS_MAX_SIZE,
  CreateCatalogItemDto,
} from "./catalog-item.dto";

function baseItem(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreateCatalogItemDto, {
    name: "Request Monitor",
    description: "Need a display",
    department: "IT Hardware",
    formFields: [
      {
        name: "size",
        label: "Size",
        type: "select",
        options: ["24\"", "27\""],
      },
    ],
    ...overrides,
  });
}

describe("CatalogFormFieldDto options bounds", () => {
  it("accepts options within limits", async () => {
    const errors = await validate(baseItem());
    expect(errors).toHaveLength(0);
  });

  it(`rejects more than ${CATALOG_OPTIONS_MAX_SIZE} options`, async () => {
    const dto = baseItem({
      formFields: [
        {
          name: "size",
          label: "Size",
          type: "select",
          options: Array.from(
            { length: CATALOG_OPTIONS_MAX_SIZE + 1 },
            (_, i) => `opt-${i}`,
          ),
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const formFieldErrors = errors.find((e) => e.property === "formFields");
    expect(formFieldErrors).toBeDefined();
  });

  it(`rejects option strings longer than ${CATALOG_OPTION_MAX_LENGTH}`, async () => {
    const dto = baseItem({
      formFields: [
        {
          name: "size",
          label: "Size",
          type: "select",
          options: ["x".repeat(CATALOG_OPTION_MAX_LENGTH + 1)],
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
