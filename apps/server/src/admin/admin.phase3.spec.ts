import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { AdminController } from "./admin.controller";
import { AssetsController } from "../assets/assets.controller";
import { ASSET_ADMIN_ROLES } from "../assets/assets.roles";

type Role = "Admin" | "Agent" | "EndUser";

const ADMIN_ROUTES = [
  "/admin/dashboard/stats",
  "/admin/charts/volume-by-module",
  "/admin/charts/status-distribution",
  "/admin/charts/sla-compliance",
  "/admin/audit-logs",
  "/admin/queues",
] as const;

function rolesGuardFor(_role: Role) {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === "isPublic") return false;
      if (key === ROLES_KEY) return ["Admin"];
      return undefined;
    },
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  return (userRole: Role) => {
    const context = {
      getHandler: () => ({}),
      getClass: () => AdminController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: "11111111-1111-4111-8111-111111111111",
            email: `${userRole.toLowerCase()}@sadhox.local`,
            name: userRole,
            role: userRole,
          } satisfies AuthUser,
        }),
      }),
    };
    return guard.canActivate(context as never);
  };
}

/** Express surface mirroring Nest @Roles("Admin") on admin + assets writes. */
function buildAuthzApp(): Express {
  const app = express();
  app.use(express.json());

  const requireAdmin: express.RequestHandler = (req, res, next) => {
    const role = (req.headers["x-role"] as Role | undefined) ?? "EndUser";
    const activate = rolesGuardFor(role);
    try {
      activate(role);
      return next();
    } catch (err) {
      if (err instanceof ForbiddenException) {
        return res.status(403).json({ message: "Insufficient role" });
      }
      throw err;
    }
  };

  const adminOk: express.RequestHandler = (_req, res) => {
    res.json({ ok: true });
  };

  for (const path of ADMIN_ROUTES) {
    app.get(path, requireAdmin, adminOk);
  }

  app.post("/assets", requireAdmin, (_req, res) => res.status(201).json({ ok: true }));
  app.patch("/assets/:id", requireAdmin, (_req, res) => res.json({ ok: true }));
  app.delete("/assets/:id", requireAdmin, (_req, res) => res.json({ ok: true }));

  return app;
}

describe("Dev C Phase 3 admin + assets authz (supertest)", () => {
  const app = buildAuthzApp();

  it.each(["EndUser", "Agent"] as const)(
    "%s receives 403 on /admin/* chart, audit, and queue routes",
    async (role) => {
      for (const path of ADMIN_ROUTES) {
        const res = await request(app).get(path).set("x-role", role);
        expect(res.status, path).toBe(403);
      }
    },
  );

  it.each(["EndUser", "Agent"] as const)(
    "%s receives 403 on /assets write operations",
    async (role) => {
      const create = await request(app)
        .post("/assets")
        .set("x-role", role)
        .send({ assetTag: "HW-1", name: "Laptop", type: "Hardware" });
      expect(create.status).toBe(403);

      const patch = await request(app)
        .patch("/assets/11111111-1111-4111-8111-111111111111")
        .set("x-role", role)
        .send({ name: "Updated" });
      expect(patch.status).toBe(403);

      const del = await request(app)
        .delete("/assets/11111111-1111-4111-8111-111111111111")
        .set("x-role", role);
      expect(del.status).toBe(403);
    },
  );

  it("Admin can reach admin reads and asset writes (smoke)", async () => {
    const stats = await request(app)
      .get("/admin/charts/sla-compliance")
      .set("x-role", "Admin");
    expect(stats.status).toBe(200);

    const create = await request(app)
      .post("/assets")
      .set("x-role", "Admin")
      .send({ assetTag: "HW-1", name: "Laptop", type: "Hardware" });
    expect(create.status).toBe(201);
  });
});

describe("Dev C Phase 3 Nest role metadata + RolesGuard", () => {
  it("AdminController remains Admin-only", () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it("AssetsController remains Admin-only for writes", () => {
    expect([...ASSET_ADMIN_ROLES]).toEqual(["Admin"]);
    const roles = Reflect.getMetadata(ROLES_KEY, AssetsController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it.each(["Agent", "EndUser"] as const)(
    "RolesGuard blocks %s from Admin controller metadata",
    (role) => {
      const activate = rolesGuardFor(role);
      expect(() => activate(role)).toThrow(ForbiddenException);
    },
  );

  it("RolesGuard allows Admin", () => {
    const activate = rolesGuardFor("Admin");
    expect(activate("Admin")).toBe(true);
  });
});
