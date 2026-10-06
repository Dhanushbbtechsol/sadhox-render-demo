import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceCatalogService } from "./service-catalog.service";

describe("ServiceCatalogService sanitize on write", () => {
  let service: ServiceCatalogService;
  let insertValues: ReturnType<typeof vi.fn>;
  let updateSet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    insertValues = vi.fn(() => ({
      returning: vi.fn(async () => [
        {
          id: "catalog-1",
          name: "Safe Name",
          description: "Safe description",
          department: "IT",
          formFields: [],
          isActive: true,
        },
      ]),
    }));

    updateSet = vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [
          {
            id: "catalog-1",
            name: "Safe Name",
            description: "Safe description",
            department: "IT",
            formFields: [],
            isActive: true,
          },
        ]),
      })),
    }));

    const db = {
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({ set: updateSet })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "catalog-1" }]),
          })),
        })),
      })),
    };

    service = new ServiceCatalogService(db as never);
  });

  it("strips HTML-like payloads from create free-text fields", async () => {
    await service.create({
      name: '<script>alert("xss")</script>Laptop',
      description: '<img src=x onerror="alert(1)">Need a laptop',
      department: "<b>Hardware</b>",
      formFields: [
        {
          name: "<script>qty</script>",
          label: '<img src=x onerror="1">Quantity',
          type: "select",
          options: ['<script>1</script>', "2", "   "],
        },
      ],
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'alert("xss") Laptop',
        description: "Need a laptop",
        department: "Hardware",
        formFields: [
          {
            name: "qty",
            label: "Quantity",
            type: "select",
            options: ["1", "2"],
          },
        ],
      }),
    );
  });

  it("sanitizes update free-text and form field options", async () => {
    await service.update("catalog-1", {
      name: "a < b > Monitor",
      description: "  line1\n\n\n\nline2  ",
      formFields: [
        {
          name: "size",
          label: "Display size",
          type: "text",
          required: true,
          options: undefined,
        },
      ],
    });

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "a b Monitor",
        description: "line1\n\nline2",
        formFields: [
          {
            name: "size",
            label: "Display size",
            type: "text",
            required: true,
          },
        ],
      }),
    );
  });

  it("rejects create when sanitization empties required fields", async () => {
    await expect(
      service.create({
        name: "<script></script>",
        description: "ok",
        department: "IT",
        formFields: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws NotFoundException when updating a missing item", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      })),
      update: vi.fn(),
    };
    const missing = new ServiceCatalogService(db as never);
    await expect(
      missing.update("missing", { name: "Nope" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
