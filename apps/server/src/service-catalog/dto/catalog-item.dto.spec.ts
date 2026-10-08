import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  CATALOG_OPTION_MAX_LENGTH,
  CATALOG_OPTIONS_MAX_SIZE,
  CATALOG_SUBCATEGORY_MAX_LENGTH,
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
} from "./catalog-item.dto";

function baseItem(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreateCatalogItemDto, {
    name: "Request Monitor",
    description: "Need a display",
    department: "Hardware",
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

describe("Catalog subcategory DTO", () => {
  it("accepts create with subcategory", async () => {
    const errors = await validate(
      baseItem({ subcategory: "Laptop request" }),
    );
    expect(errors).toHaveLength(0);
  });

  it("accepts create without subcategory", async () => {
    const errors = await validate(baseItem());
    expect(errors).toHaveLength(0);
  });

  it("accepts create with null subcategory", async () => {
    const errors = await validate(baseItem({ subcategory: null }));
    expect(errors).toHaveLength(0);
  });

  it(`rejects subcategory longer than ${CATALOG_SUBCATEGORY_MAX_LENGTH}`, async () => {
    const errors = await validate(
      baseItem({
        subcategory: "x".repeat(CATALOG_SUBCATEGORY_MAX_LENGTH + 1),
      }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts update with and without subcategory", async () => {
    const withSub = plainToInstance(UpdateCatalogItemDto, {
      subcategory: "Monitor request",
    });
    const withoutSub = plainToInstance(UpdateCatalogItemDto, {
      name: "Renamed item",
    });
    const clearSub = plainToInstance(UpdateCatalogItemDto, {
      subcategory: null,
    });
    expect(await validate(withSub)).toHaveLength(0);
    expect(await validate(withoutSub)).toHaveLength(0);
    expect(await validate(clearSub)).toHaveLength(0);
  });
});
