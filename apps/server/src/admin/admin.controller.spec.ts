import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminController } from "./admin.controller";

describe("Dev C Phase 2 admin authz", () => {
  it("AdminController is Admin-only", () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it("RolesGuard blocks EndUser from admin dashboard routes", () => {
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
          user: {
            userId: "2",
            email: "end@sadhox.local",
            name: "End",
            role: "EndUser",
          },
        }),
      }),
    };

    expect(() =>
      guard.canActivate(context as never),
    ).toThrow("Insufficient role");
  });
});
