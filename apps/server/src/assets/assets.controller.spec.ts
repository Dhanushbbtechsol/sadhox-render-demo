import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../common/guards/roles.guard";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { AssetsController } from "./assets.controller";
import {
  ASSET_ADMIN_ROLES,
  isOpenIncidentStatus,
  isOpenRequestStatus,
} from "./assets.roles";

describe("Dev C Phase 2 asset contracts", () => {
  it("assets APIs are Admin-only", () => {
    expect([...ASSET_ADMIN_ROLES]).toEqual(["Admin"]);
  });

  it("AssetsController class requires Admin role metadata", () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AssetsController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it("RolesGuard rejects Agent for Admin-only metadata", () => {
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
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: "1", email: "a@b.c", name: "Agent", role: "Agent" },
        }),
      }),
    };

    expect(() =>
      guard.canActivate(context as never),
    ).toThrow("Insufficient role");
  });

  it("link-ticket accepts only active incident statuses", () => {
    expect(isOpenIncidentStatus("InProgress")).toBe(true);
    expect(isOpenIncidentStatus("Closed")).toBe(false);
  });

  it("link-ticket accepts only active service-request statuses", () => {
    expect(isOpenRequestStatus("Approved")).toBe(true);
    expect(isOpenRequestStatus("Draft")).toBe(false);
  });
});
