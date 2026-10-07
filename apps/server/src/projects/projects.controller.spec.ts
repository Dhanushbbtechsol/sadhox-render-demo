import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { ProjectsController } from "./projects.controller";

describe("ProjectsController RBAC metadata", () => {
  const create = ProjectsController.prototype.create;
  const list = ProjectsController.prototype.list;
  const get = ProjectsController.prototype.get;
  const update = ProjectsController.prototype.update;
  const addMember = ProjectsController.prototype.addMember;
  const createModule = ProjectsController.prototype.createModule;

  it("create/update/members/modules writes are Admin-only", () => {
    expect(Reflect.getMetadata(ROLES_KEY, create)).toEqual(["Admin"]);
    expect(Reflect.getMetadata(ROLES_KEY, update)).toEqual(["Admin"]);
    expect(Reflect.getMetadata(ROLES_KEY, addMember)).toEqual(["Admin"]);
    expect(Reflect.getMetadata(ROLES_KEY, createModule)).toEqual(["Admin"]);
  });

  it("list/get allow Admin and Manager", () => {
    expect(Reflect.getMetadata(ROLES_KEY, list)).toEqual([
      "Admin",
      "Manager",
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, get)).toEqual(["Admin", "Manager"]);
  });

  it("RolesGuard allows Manager on list metadata", () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === "isPublic") return false;
        if (key === ROLES_KEY) return ["Admin", "Manager"];
        return undefined;
      },
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getType: () => "http",
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: "1",
            email: "m@sadhox.local",
            name: "Manager",
            role: "Manager",
          },
        }),
      }),
    };
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("RolesGuard rejects Agent on Admin-only create", () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === "isPublic") return false;
        if (key === ROLES_KEY) return ["Admin"];
        return undefined;
      },
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getType: () => "http",
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: "1",
            email: "a@sadhox.local",
            name: "Agent",
            role: "Agent",
          },
        }),
      }),
    };
    expect(() => guard.canActivate(context as never)).toThrow(
      "Insufficient role",
    );
  });
});
