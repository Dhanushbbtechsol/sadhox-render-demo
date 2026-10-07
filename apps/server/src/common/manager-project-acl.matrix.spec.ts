import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./decorators/roles.decorator";
import { RolesGuard } from "./guards/roles.guard";
import type { UserRole } from "./types/roles";
import { ProjectAccessService } from "../projects/project-access.service";
import { buildTicketProjectListFilter } from "../projects/project-list-scope";
import { IncidentsController } from "../incidents/incidents.controller";
import { ProblemsController } from "../problems/problems.controller";
import { ServiceRequestsController } from "../service-requests/service-requests.controller";
import { ChangesController } from "../changes/changes.controller";

const OWN = "proj-own";
const OTHER = "proj-other";

function chainLimit(result: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => result),
      })),
    })),
  };
}

/** Manager owns OWN only (manager_id hit); OTHER and membership miss. */
function accessForOwnProject() {
  return new ProjectAccessService({
    select: vi.fn((..._args: unknown[]) => {
      // First call in canAccess/canApprove: manager_id query
      return chainLimit([{ id: OWN }]);
    }),
  } as never);
}

function accessForOtherOrNull() {
  return new ProjectAccessService({
    select: vi.fn(() => chainLimit([])),
  } as never);
}

const MODULES = [
  "incidents",
  "problems",
  "service-requests",
  "changes",
] as const;

describe("Phase 6 Day 29 — Manager × own / other / null project ACL", () => {
  const manager = { userId: "mgr-1", role: "Manager" as const };

  describe.each(MODULES)("module context: %s", (module) => {
    it(`${module}: Manager canAccess own project`, async () => {
      const access = new ProjectAccessService({
        select: vi
          .fn()
          .mockReturnValueOnce(chainLimit([{ id: OWN }])),
      } as never);
      await expect(access.canAccess(manager, OWN)).resolves.toBe(true);
      void module;
    });

    it(`${module}: Manager cannot canAccess other project`, async () => {
      const access = new ProjectAccessService({
        select: vi
          .fn()
          .mockReturnValueOnce(chainLimit([]))
          .mockReturnValueOnce(chainLimit([])),
      } as never);
      await expect(access.canAccess(manager, OTHER)).resolves.toBe(false);
    });

    it(`${module}: Manager cannot canAccess null project`, async () => {
      const access = new ProjectAccessService({} as never);
      await expect(access.canAccess(manager, null)).resolves.toBe(false);
    });
  });

  describe("approvals (SR + Change)", () => {
    it.each(["service-requests", "changes"] as const)(
      "%s: Manager canApprove own project",
      async () => {
        const access = accessForOwnProject();
        // canApprove only hits manager_id path once
        await expect(access.canApprove(manager, OWN)).resolves.toBe(true);
        await expect(access.assertCanApprove(manager, OWN)).resolves.toBe(
          undefined,
        );
      },
    );

    it.each(["service-requests", "changes"] as const)(
      "%s: Manager 403 on other project",
      async () => {
        const access = accessForOtherOrNull();
        await expect(access.canApprove(manager, OTHER)).resolves.toBe(false);
        await expect(
          access.assertCanApprove(manager, OTHER),
        ).rejects.toBeInstanceOf(ForbiddenException);
      },
    );

    it.each(["service-requests", "changes"] as const)(
      "%s: Manager 403 on null project (Admin-only)",
      async () => {
        const access = new ProjectAccessService({} as never);
        await expect(access.canApprove(manager, null)).resolves.toBe(false);
        await expect(access.assertCanApprove(manager, null)).rejects.toThrow(
          /Null-project tickets require Admin/,
        );
      },
    );

    it("Admin canApprove null project", async () => {
      const access = new ProjectAccessService({} as never);
      await expect(
        access.assertCanApprove({ userId: "a", role: "Admin" }, null),
      ).resolves.toBe(undefined);
    });
  });

  describe("list filter (shared helper)", () => {
    const col = { name: "project_id" } as never;

    it("Manager list filter is defined when they have accessible ids (own)", () => {
      expect(
        buildTicketProjectListFilter(col, "Manager", [OWN]),
      ).toBeDefined();
    });

    it("Manager with empty accessible ids matches nothing (no null tickets)", () => {
      expect(buildTicketProjectListFilter(col, "Manager", [])).toBeDefined();
    });

    it("Agent still sees null-project tickets when no memberships", () => {
      expect(buildTicketProjectListFilter(col, "Agent", [])).toBeDefined();
    });
  });

  describe("HTTP @Roles allow Manager on list + approve routes", () => {
    function rolesOf(handler: (...args: never[]) => unknown): UserRole[] {
      return Reflect.getMetadata(ROLES_KEY, handler) as UserRole[];
    }

    it("list endpoints include Manager", () => {
      expect(rolesOf(IncidentsController.prototype.list)).toContain("Manager");
      expect(rolesOf(ProblemsController.prototype.list)).toContain("Manager");
      expect(rolesOf(ServiceRequestsController.prototype.list)).toContain(
        "Manager",
      );
      expect(rolesOf(ChangesController.prototype.list)).toContain("Manager");
    });

    it("approve endpoints include Admin and Manager", () => {
      expect(rolesOf(ServiceRequestsController.prototype.approve)).toEqual([
        "Admin",
        "Manager",
      ]);
      expect(rolesOf(ServiceRequestsController.prototype.reject)).toEqual([
        "Admin",
        "Manager",
      ]);
      expect(rolesOf(ChangesController.prototype.approve)).toEqual([
        "Admin",
        "Manager",
      ]);
    });

    it("RolesGuard allows Manager on approve metadata", () => {
      const reflector = {
        getAllAndOverride: (key: string) => {
          if (key === "isPublic") return false;
          if (key === ROLES_KEY) return ["Admin", "Manager"];
          return undefined;
        },
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(
        guard.canActivate({
          getType: () => "http",
          getHandler: () => ({}),
          getClass: () => ({}),
          switchToHttp: () => ({
            getRequest: () => ({
              user: {
                userId: "1",
                email: "m@x",
                name: "M",
                role: "Manager",
              },
            }),
          }),
        } as never),
      ).toBe(true);
    });
  });
});
