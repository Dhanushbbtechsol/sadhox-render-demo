import {
  CanActivate,
  ExecutionContext,
  type INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { HealthCheckService } from "@nestjs/terminus";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AdminController } from "../admin/admin.controller";
import { AdminService } from "../admin/admin.service";
import { AssetsController } from "../assets/assets.controller";
import { AssetsService } from "../assets/assets.service";
import { AuthController } from "../auth/auth.controller";
import { AuthService } from "../auth/auth.service";
import { ChangesController } from "../changes/changes.controller";
import { ChangesService } from "../changes/changes.service";
import type { AuthUser } from "./decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";
import { RolesGuard } from "./guards/roles.guard";
import type { UserRole } from "./types/roles";
import { DrizzleHealthIndicator } from "../health/drizzle.health";
import { HealthController } from "../health/health.controller";
import { RedisHealthIndicator } from "../health/redis.health";
import { IncidentsController } from "../incidents/incidents.controller";
import { IncidentsService } from "../incidents/incidents.service";
import { KnowledgeController } from "../knowledge/knowledge.controller";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { ProblemsController } from "../problems/problems.controller";
import { ProblemsService } from "../problems/problems.service";
import { ServiceCatalogController } from "../service-catalog/service-catalog.controller";
import { ServiceCatalogService } from "../service-catalog/service-catalog.service";
import { ServiceRequestsController } from "../service-requests/service-requests.controller";
import { ServiceRequestsService } from "../service-requests/service-requests.service";
import { ProjectsController } from "../projects/projects.controller";
import { ProjectsService } from "../projects/projects.service";

const ID = "11111111-1111-4111-8111-111111111111";
const ALL_ROLES: UserRole[] = ["Admin", "Agent", "EndUser", "Manager"];

type MatrixRow = {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  allowed: UserRole[];
};

const MATRIX: MatrixRow[] = [
  { method: "get", path: "/incidents", allowed: ["Admin", "Agent", "EndUser", "Manager"] },
  { method: "post", path: "/incidents", allowed: ["Admin", "Agent", "EndUser"] },
  {
    method: "get",
    path: `/incidents/${ID}`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  { method: "patch", path: `/incidents/${ID}`, allowed: ["Admin", "Agent"] },
  {
    method: "get",
    path: `/incidents/${ID}/comments`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "get",
    path: `/incidents/${ID}/linked-assets`,
    allowed: ["Admin", "Agent"],
  },
  {
    method: "post",
    path: `/incidents/${ID}/comments`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  { method: "get", path: "/problems", allowed: ["Admin", "Agent", "Manager"] },
  { method: "post", path: "/problems", allowed: ["Admin", "Agent"] },
  { method: "get", path: `/problems/${ID}`, allowed: ["Admin", "Agent"] },
  { method: "patch", path: `/problems/${ID}`, allowed: ["Admin", "Agent"] },
  {
    method: "get",
    path: "/service-requests",
    allowed: ["Admin", "Agent", "EndUser", "Manager"],
  },
  {
    method: "post",
    path: "/service-requests",
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "get",
    path: `/service-requests/${ID}`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "patch",
    path: `/service-requests/${ID}/approve`,
    allowed: ["Admin", "Manager"],
  },
  {
    method: "patch",
    path: `/service-requests/${ID}/reject`,
    allowed: ["Admin", "Manager"],
  },
  { method: "get", path: "/changes", allowed: ["Admin", "Agent", "Manager"] },
  { method: "post", path: "/changes", allowed: ["Admin", "Agent"] },
  { method: "get", path: `/changes/${ID}`, allowed: ["Admin", "Agent"] },
  { method: "patch", path: `/changes/${ID}/approve`, allowed: ["Admin", "Manager"] },
  { method: "patch", path: `/changes/${ID}`, allowed: ["Admin", "Agent"] },
  { method: "get", path: "/assets", allowed: ["Admin"] },
  { method: "post", path: "/assets", allowed: ["Admin"] },
  { method: "get", path: `/assets/${ID}`, allowed: ["Admin"] },
  { method: "patch", path: `/assets/${ID}`, allowed: ["Admin"] },
  { method: "delete", path: `/assets/${ID}`, allowed: ["Admin"] },
  { method: "post", path: `/assets/${ID}/link-ticket`, allowed: ["Admin"] },
  { method: "delete", path: `/assets/${ID}/unlink-ticket`, allowed: ["Admin"] },
  {
    method: "get",
    path: "/service-catalog",
    allowed: ["Admin", "Agent", "EndUser"],
  },
  { method: "post", path: "/service-catalog", allowed: ["Admin"] },
  {
    method: "patch",
    path: `/service-catalog/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "get",
    path: "/knowledge/categories",
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "post",
    path: "/knowledge/categories",
    allowed: ["Admin"],
  },
  {
    method: "patch",
    path: `/knowledge/categories/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "delete",
    path: `/knowledge/categories/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "get",
    path: "/knowledge/articles",
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "post",
    path: "/knowledge/articles",
    allowed: ["Admin"],
  },
  {
    method: "get",
    path: `/knowledge/articles/${ID}`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "patch",
    path: `/knowledge/articles/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "delete",
    path: `/knowledge/articles/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "get",
    path: `/knowledge/tickets/incident/${ID}/links`,
    allowed: ["Admin", "Agent", "EndUser"],
  },
  {
    method: "post",
    path: `/knowledge/tickets/incident/${ID}/links`,
    allowed: ["Admin", "Agent"],
  },
  {
    method: "delete",
    path: `/knowledge/tickets/incident/${ID}/links/${ID}`,
    allowed: ["Admin", "Agent"],
  },
  { method: "get", path: "/admin/dashboard/stats", allowed: ["Admin"] },
  { method: "get", path: "/admin/sla-rules", allowed: ["Admin"] },
  { method: "patch", path: "/admin/sla-rules", allowed: ["Admin"] },
  { method: "patch", path: "/admin/sla-rules/P1", allowed: ["Admin"] },
  {
    method: "patch",
    path: `/admin/users/${ID}/role`,
    allowed: ["Admin"],
  },
  { method: "get", path: "/health/ready", allowed: ["Admin"] },
  // Phase 6 — projects
  { method: "get", path: "/projects", allowed: ["Admin", "Manager"] },
  { method: "post", path: "/projects", allowed: ["Admin"] },
  { method: "get", path: `/projects/${ID}`, allowed: ["Admin", "Manager"] },
  { method: "patch", path: `/projects/${ID}`, allowed: ["Admin"] },
  { method: "delete", path: `/projects/${ID}`, allowed: ["Admin"] },
  {
    method: "get",
    path: `/projects/${ID}/members`,
    allowed: ["Admin", "Manager"],
  },
  { method: "post", path: `/projects/${ID}/members`, allowed: ["Admin"] },
  {
    method: "delete",
    path: `/projects/${ID}/members/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "get",
    path: `/projects/${ID}/modules`,
    allowed: ["Admin", "Manager"],
  },
  { method: "post", path: `/projects/${ID}/modules`, allowed: ["Admin"] },
  {
    method: "patch",
    path: `/projects/${ID}/modules/${ID}`,
    allowed: ["Admin"],
  },
  {
    method: "delete",
    path: `/projects/${ID}/modules/${ID}`,
    allowed: ["Admin"],
  },
];

function stubService(methods: string[]) {
  const out: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of methods) {
    out[m] = vi.fn().mockResolvedValue({ ok: true });
  }
  return out;
}

function createTestAuthGuard(reflector: Reflector): CanActivate {
  return {
    canActivate(context: ExecutionContext): boolean {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;

      const req = context.switchToHttp().getRequest<{
        headers: Record<string, string | undefined>;
        user?: AuthUser;
      }>();
      const role = req.headers["x-test-role"];
      if (!role) {
        throw new UnauthorizedException("missing x-test-role");
      }
      req.user = {
        userId: ID,
        email: `${role.toLowerCase()}@sadhox.local`,
        role: role as UserRole,
        name: role,
      };
      return true;
    },
  };
}

describe("Checkpoint 3 RBAC matrix (Supertest)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        HealthController,
        IncidentsController,
        ProblemsController,
        ServiceRequestsController,
        ChangesController,
        AssetsController,
        ServiceCatalogController,
        KnowledgeController,
        ProjectsController,
        AdminController,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => createTestAuthGuard(reflector),
          inject: [Reflector],
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        {
          provide: AuthService,
          useValue: stubService(["login", "refresh", "logout"]),
        },
        {
          provide: HealthCheckService,
          useValue: {
            check: vi.fn().mockResolvedValue({ status: "ok", details: {} }),
          },
        },
        {
          provide: DrizzleHealthIndicator,
          useValue: { pingCheck: vi.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { pingCheck: vi.fn() },
        },
        {
          provide: IncidentsService,
          useValue: stubService([
            "list",
            "get",
            "create",
            "update",
            "listComments",
            "addComment",
            "listLinkedAssets",
          ]),
        },
        {
          provide: ProblemsService,
          useValue: stubService(["list", "get", "create", "update"]),
        },
        {
          provide: ServiceRequestsService,
          useValue: stubService([
            "list",
            "get",
            "create",
            "approve",
            "reject",
          ]),
        },
        {
          provide: ChangesService,
          useValue: stubService([
            "list",
            "get",
            "create",
            "approve",
            "update",
          ]),
        },
        {
          provide: AssetsService,
          useValue: stubService([
            "list",
            "getById",
            "create",
            "update",
            "softDelete",
            "linkTicket",
            "unlinkTicket",
          ]),
        },
        {
          provide: ServiceCatalogService,
          useValue: stubService(["list", "create", "update"]),
        },
        {
          provide: KnowledgeService,
          useValue: stubService([
            "listCategories",
            "createCategory",
            "updateCategory",
            "deleteCategory",
            "listArticles",
            "createArticle",
            "getArticle",
            "updateArticle",
            "deleteArticle",
            "listLinks",
            "linkArticle",
            "unlinkArticle",
          ]),
        },
        {
          provide: AdminService,
          useValue: stubService([
            "dashboardStats",
            "ticketsByStatus",
            "slaPerformance",
            "listSlaRules",
            "updateSlaRule",
            "updateUserRole",
          ]),
        },
        {
          provide: ProjectsService,
          useValue: stubService([
            "list",
            "getById",
            "create",
            "update",
            "remove",
            "listMembers",
            "addMember",
            "removeMember",
            "listModules",
            "createModule",
            "updateModule",
            "removeModule",
          ]),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("public liveness endpoints work without role header", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
    await request(app.getHttpServer()).get("/health/live").expect(200);
  });

  it.each([
    { method: "get" as const, path: "/incidents" },
    { method: "get" as const, path: "/admin/dashboard/stats" },
    { method: "get" as const, path: "/admin/sla-rules" },
    { method: "patch" as const, path: "/admin/sla-rules" },
    { method: "patch" as const, path: "/admin/sla-rules/P1" },
    { method: "get" as const, path: "/assets" },
    { method: "get" as const, path: "/problems" },
    { method: "get" as const, path: "/health/ready" },
    { method: "get" as const, path: "/knowledge/articles" },
    {
      method: "post" as const,
      path: `/knowledge/tickets/incident/${ID}/links`,
    },
  ])("unauthenticated $method $path → 401", async ({ method, path }) => {
    const req = request(app.getHttpServer())[method](path);
    if (method === "post" || method === "patch") {
      await req
        .send({
          priority: "P1",
          responseMinutes: 15,
          resolveMinutes: 240,
          articleId: ID,
        })
        .expect(401);
      return;
    }
    await req.expect(401);
  });

  it("EndUser is 403 on Admin-only and Agent-only routes", async () => {
    await request(app.getHttpServer())
      .get("/admin/dashboard/stats")
      .set("x-test-role", "EndUser")
      .expect(403);
    await request(app.getHttpServer())
      .get("/admin/sla-rules")
      .set("x-test-role", "EndUser")
      .expect(403);
    await request(app.getHttpServer())
      .patch("/admin/sla-rules/P1")
      .set("x-test-role", "EndUser")
      .send({ responseMinutes: 15, resolveMinutes: 240 })
      .expect(403);
    await request(app.getHttpServer())
      .get("/assets")
      .set("x-test-role", "EndUser")
      .expect(403);
    await request(app.getHttpServer())
      .get("/problems")
      .set("x-test-role", "EndUser")
      .expect(403);
  });

  it("Agent is 403 on Admin-only routes", async () => {
    await request(app.getHttpServer())
      .get("/admin/dashboard/stats")
      .set("x-test-role", "Agent")
      .expect(403);
    await request(app.getHttpServer())
      .get("/admin/sla-rules")
      .set("x-test-role", "Agent")
      .expect(403);
    await request(app.getHttpServer())
      .patch("/admin/sla-rules")
      .set("x-test-role", "Agent")
      .send({ priority: "P1", responseMinutes: 15, resolveMinutes: 240 })
      .expect(403);
    await request(app.getHttpServer())
      .get("/assets")
      .set("x-test-role", "Agent")
      .expect(403);
    await request(app.getHttpServer())
      .get("/health/ready")
      .set("x-test-role", "Agent")
      .expect(403);
  });

  it("Admin succeeds on SLA rules GET/PATCH", async () => {
    await request(app.getHttpServer())
      .get("/admin/sla-rules")
      .set("x-test-role", "Admin")
      .expect(200);
    await request(app.getHttpServer())
      .patch("/admin/sla-rules/P1")
      .set("x-test-role", "Admin")
      .send({ responseMinutes: 15, resolveMinutes: 240 })
      .expect((res) => {
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
  });

  it.each(
    MATRIX.flatMap((row) =>
      ALL_ROLES.map((role) => ({
        method: row.method,
        path: row.path,
        role,
        expectAllow: row.allowed.includes(role),
      })),
    ),
  )("$method $path as $role", async ({ method, path, role, expectAllow }) => {
    let req = request(app.getHttpServer())[method](path).set(
      "x-test-role",
      role,
    );
    if (method === "post" || method === "patch") {
      req = req.send({});
    }
    const res = await req;
    if (expectAllow) {
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    } else {
      expect(res.status).toBe(403);
    }
  });
});
