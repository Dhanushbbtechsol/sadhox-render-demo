import { describe, expect, it, vi } from "vitest";
import { ServiceCatalogService } from "./service-catalog.service";

describe("ServiceCatalogService sanitize on write", () => {
  it("create strips hostile HTML from name/description/department and form fields", async () => {
    let inserted: Record<string, unknown> | undefined;
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn((row: Record<string, unknown>) => {
          inserted = row;
          return {
            returning: vi.fn(async () => [{ id: "cat-1", ...row }]),
          };
        }),
      })),
    };
    const svc = new ServiceCatalogService(db as never);

    await svc.create({
      name: '<script>alert("xss")</script>Monitor',
      description: '<img src=x onerror="alert(1)">Need a display',
      department: "IT <b>Hardware</b>",
      formFields: [
        {
          name: "size<script>",
          label: '<img src=x>Size',
          type: "select",
          required: true,
          options: ['24"', '<script>evil</script>27"'],
        },
      ],
    });

    expect(inserted).toMatchObject({
      name: 'alert("xss") Monitor',
      description: "Need a display",
      department: "IT Hardware",
      formFields: [
        {
          name: "size",
          label: "Size",
          type: "select",
          required: true,
          options: ['24"', 'evil 27"'],
        },
      ],
    });
  });

  it("update sanitizes the same fields when provided", async () => {
    let patched: Record<string, unknown> | undefined;
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "cat-1" }]),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn((row: Record<string, unknown>) => {
          patched = row;
          return {
            where: vi.fn(() => ({
              returning: vi.fn(async () => [{ id: "cat-1", ...row }]),
            })),
          };
        }),
      })),
    };
    const svc = new ServiceCatalogService(db as never);

    await svc.update("cat-1", {
      description: "a < b > c with <div>tags</div>",
      formFields: [
        {
          name: "ok",
          label: "Label\u0000bad",
          type: "text",
          options: ["<i>italic</i>option"],
        },
      ],
    });

    expect(patched?.description).toBe("a b c with tags");
    expect(patched?.formFields).toEqual([
      {
        name: "ok",
        label: "Labelbad",
        type: "text",
        options: ["italic option"],
      },
    ]);
  });
});
