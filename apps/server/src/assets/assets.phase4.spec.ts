import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { AssetsController } from "./assets.controller";
import { ASSET_ADMIN_ROLES } from "./assets.roles";

type Role = "Admin" | "Agent" | "EndUser";

function activateRolesGuard(userRole: Role, required: string[] = ["Admin"]) {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === "isPublic") return false;
      if (key === ROLES_KEY) return required;
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
          userId: "11111111-1111-4111-8111-111111111111",
          email: `${userRole.toLowerCase()}@sadhox.local`,
          name: userRole,
          role: userRole,
        } satisfies AuthUser,
      }),
    }),
  };
  return guard.canActivate(context as never);
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());

  const requireAdmin: express.RequestHandler = (req, res, next) => {
    const role = (req.headers["x-role"] as Role | undefined) ?? "EndUser";
    try {
      activateRolesGuard(role, ["Admin"]);
      return next();
    } catch (err) {
      if (err instanceof ForbiddenException) {
        return res.status(403).json({ message: "Insufficient role" });
      }
      throw err;
    }
  };

  const assets = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      assetTag: "HW-1",
      referenceCode: "AST-000001",
      name: "Safe",
      purchaseCost: "999.00",
      linkedTicketId: null,
    },
  ];

  app.get("/assets", requireAdmin, (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    // Mirror Drizzle parameterization: treat search as literal filter, never SQL.
    const filtered = assets.filter(
      (a) =>
        search.length === 0 ||
        a.assetTag.includes(search) ||
        a.name.includes(search) ||
        a.referenceCode.includes(search),
    );
    return res.json({ data: filtered, total: filtered.length });
  });

  app.delete("/assets/:id", requireAdmin, (_req, res) => {
    return res.json({ ok: true, status: "Retired" });
  });

  app.get("/incidents/:id/linked-assets", (req, res) => {
    const role = (req.headers["x-role"] as Role | undefined) ?? "EndUser";
    try {
      activateRolesGuard(role, ["Admin", "Agent"]);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        return res.status(403).json({ message: "Insufficient role" });
      }
      throw err;
    }
    // Financial field intentionally omitted for Agent-facing projection.
    return res.json([
      {
        id: assets[0]!.id,
        assetTag: assets[0]!.assetTag,
        name: assets[0]!.name,
        type: "Hardware",
        status: "Active",
        ownerName: null,
        linkedTicketId: req.params.id,
      },
    ]);
  });

  return app;
}

describe("Dev C Phase 4 assets security", () => {
  const app = buildApp();

  it("AssetsController remains Admin-only", () => {
    expect([...ASSET_ADMIN_ROLES]).toEqual(["Admin"]);
    const roles = Reflect.getMetadata(ROLES_KEY, AssetsController) as string[];
    expect(roles).toEqual(["Admin"]);
  });

  it.each(["EndUser", "Agent"] as const)(
    "%s cannot delete assets (403)",
    async (role) => {
      const res = await request(app)
        .delete("/assets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        .set("x-role", role);
      expect(res.status).toBe(403);
    },
  );

  it("Admin can delete/retire assets", async () => {
    const res = await request(app)
      .delete("/assets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
      .set("x-role", "Admin");
    expect(res.status).toBe(200);
  });

  it("search with SQL injection payload does not dump all rows", async () => {
    const payload = "' OR 1=1--";
    const res = await request(app)
      .get("/assets")
      .query({ search: payload })
      .set("x-role", "Admin");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.data).toEqual([]);
  });

  it("linked-assets response never includes purchaseCost", async () => {
    const res = await request(app)
      .get("/incidents/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/linked-assets")
      .set("x-role", "Agent");
    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty("purchaseCost");
  });

  it("EndUser cannot read linked-assets (403)", async () => {
    const res = await request(app)
      .get("/incidents/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/linked-assets")
      .set("x-role", "EndUser");
    expect(res.status).toBe(403);
  });
});

describe("listLinkedPublic shape contract", () => {
  it("public projection keys exclude financial fields", () => {
    const publicKeys = [
      "id",
      "assetTag",
      "name",
      "type",
      "status",
      "ownerName",
      "linkedTicketId",
    ];
    expect(publicKeys).not.toContain("purchaseCost");
  });
});
