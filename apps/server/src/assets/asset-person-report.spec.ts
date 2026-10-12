import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { AssetsController } from "./assets.controller";
import { ASSET_ADMIN_ROLES } from "./assets.roles";
import { AssetsService, computeHoldingWindows, windowOverlapsRange } from "./assets.service";

const PERSON_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERSON_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ASSET_1 = "11111111-1111-4111-8111-111111111111";
const ASSET_2 = "22222222-2222-4222-8222-222222222222";

function activateRolesGuard(role: "Admin" | "Agent" | "EndUser") {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === "isPublic") return false;
      if (key === ROLES_KEY) return ["Admin"];
      return undefined;
    },
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context = {
    getHandler: () => ({}),
    getClass: () => AssetsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          userId: "99999999-9999-4999-8999-999999999999",
          email: `${role.toLowerCase()}@sadhox.local`,
          name: role,
          role,
        } satisfies AuthUser,
      }),
    }),
  };
  return () => guard.canActivate(context as never);
}

describe("GET /assets/report/person — Admin-only gate", () => {
  it("AssetsController class metadata is Admin-only (covers the new report route too)", () => {
    expect([...ASSET_ADMIN_ROLES]).toEqual(["Admin"]);
    const roles = Reflect.getMetadata(ROLES_KEY, AssetsController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it.each(["Agent", "EndUser"] as const)(
    "rejects %s with Insufficient role",
    (role) => {
      expect(activateRolesGuard(role)).toThrow("Insufficient role");
      expect(activateRolesGuard(role)).toThrow(ForbiddenException);
    },
  );

  it("allows Admin through the guard", () => {
    expect(activateRolesGuard("Admin")()).toBe(true);
  });
});

describe("AssetsService.personReport — field validation", () => {
  it("rejects a from date after the to date", async () => {
    const service = new AssetsService({} as never, {} as never);
    await expect(
      service.personReport({
        personId: PERSON_A,
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("computeHoldingWindows + windowOverlapsRange — KTD5 interval overlap (AE5)", () => {
  it("a transfer last month is found for both the previous and the new holder", () => {
    // Asset 1 was held by Person A, then transferred to Person B mid-month.
    const eventsByAsset = new Map([
      [
        ASSET_1,
        [
          { createdAt: new Date("2026-08-01T00:00:00.000Z"), fromOwnerId: null, toOwnerId: PERSON_A },
          { createdAt: new Date("2026-09-15T00:00:00.000Z"), fromOwnerId: PERSON_A, toOwnerId: PERSON_B },
        ],
      ],
    ]);
    const assetInfo = new Map([
      [ASSET_1, { assetTag: "HW-1", referenceCode: "AST-000001", name: "Laptop" }],
    ]);
    const rangeFrom = new Date("2026-09-01T00:00:00.000Z");
    const rangeTo = new Date("2026-09-30T23:59:59.999Z");

    const windowsA = computeHoldingWindows(eventsByAsset, assetInfo, PERSON_A);
    const windowsB = computeHoldingWindows(eventsByAsset, assetInfo, PERSON_B);

    expect(windowsA.some((w) => windowOverlapsRange(w, rangeFrom, rangeTo))).toBe(true);
    expect(windowsB.some((w) => windowOverlapsRange(w, rangeFrom, rangeTo))).toBe(true);
  });

  it("an asset held the whole month with no change still appears for that holder", () => {
    const eventsByAsset = new Map([
      [
        ASSET_2,
        [{ createdAt: new Date("2026-01-01T00:00:00.000Z"), fromOwnerId: null, toOwnerId: PERSON_A }],
      ],
    ]);
    const assetInfo = new Map([
      [ASSET_2, { assetTag: "HW-2", referenceCode: "AST-000002", name: "Monitor" }],
    ]);
    const rangeFrom = new Date("2026-09-01T00:00:00.000Z");
    const rangeTo = new Date("2026-09-30T23:59:59.999Z");

    const windows = computeHoldingWindows(eventsByAsset, assetInfo, PERSON_A);
    expect(windows.some((w) => windowOverlapsRange(w, rangeFrom, rangeTo))).toBe(true);
  });

  it("a date range with no overlapping rows yields an empty report", () => {
    const eventsByAsset = new Map([
      [
        ASSET_1,
        [{ createdAt: new Date("2026-08-01T00:00:00.000Z"), fromOwnerId: null, toOwnerId: PERSON_A }],
      ],
    ]);
    const assetInfo = new Map([
      [ASSET_1, { assetTag: "HW-1", referenceCode: "AST-000001", name: "Laptop" }],
    ]);
    // Person A's window starts after this range ends — no overlap.
    const rangeFrom = new Date("2026-01-01T00:00:00.000Z");
    const rangeTo = new Date("2026-01-31T23:59:59.999Z");

    const windows = computeHoldingWindows(eventsByAsset, assetInfo, PERSON_A);
    const matches = windows.filter((w) => windowOverlapsRange(w, rangeFrom, rangeTo));
    expect(matches).toEqual([]);
  });
});

describe("AssetsService.personReport — end-to-end with a mocked db (AE5)", () => {
  function buildDb(assignmentRows: Array<{
    assetId: string;
    assetTag: string;
    referenceCode: string;
    name: string;
    fromOwnerId: string | null;
    toOwnerId: string | null;
    createdAt: Date;
  }>) {
    const distinctAssetIds = [...new Set(assignmentRows.map((r) => r.assetId))];
    const selectDistinctChain = {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue(distinctAssetIds.map((assetId) => ({ assetId }))),
    };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(assignmentRows),
    };
    return {
      selectDistinct: vi.fn(() => selectDistinctChain),
      select: vi.fn(() => selectChain),
    };
  }

  it("lists the asset for the previous holder when reporting on the month of a transfer", async () => {
    const db = buildDb([
      {
        assetId: ASSET_1,
        assetTag: "HW-1",
        referenceCode: "AST-000001",
        name: "Laptop",
        fromOwnerId: null,
        toOwnerId: PERSON_A,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      {
        assetId: ASSET_1,
        assetTag: "HW-1",
        referenceCode: "AST-000001",
        name: "Laptop",
        fromOwnerId: PERSON_A,
        toOwnerId: PERSON_B,
        createdAt: new Date("2026-09-15T00:00:00.000Z"),
      },
    ]);
    const service = new AssetsService(db as never, {} as never);

    const result = await service.personReport({
      personId: PERSON_A,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      assetId: ASSET_1,
      referenceCode: "AST-000001",
    });
  });

  it("returns an empty list when the person touched no assets", async () => {
    const db = buildDb([]);
    const service = new AssetsService(db as never, {} as never);

    const result = await service.personReport({
      personId: PERSON_A,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    });

    expect(result.data).toEqual([]);
  });
});
