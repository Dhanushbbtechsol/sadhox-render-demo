import {
  ConflictException,
  ForbiddenException,
  type INestApplication,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AdminController } from "../admin/admin.controller";
import { AdminService } from "../admin/admin.service";
import { AuthController } from "../auth/auth.controller";
import { AuthService } from "../auth/auth.service";
import { RefreshCookieOriginGuard } from "../auth/refresh-cookie-origin.guard";
import { ChangesController } from "../changes/changes.controller";
import { ChangesService } from "../changes/changes.service";
import type { AuthUser } from "./decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";
import { RolesGuard } from "./guards/roles.guard";
import type { UserRole } from "./types/roles";
import { ServiceRequestsController } from "../service-requests/service-requests.controller";
import { ServiceRequestsService } from "../service-requests/service-requests.service";

const ID = "11111111-1111-4111-8111-111111111111";

function createTestAuthGuard(reflector: Reflector) {
  return {
    canActivate(context: {
      getHandler: () => unknown;
      getClass: () => unknown;
      switchToHttp: () => {
        getRequest: () => {
          headers: Record<string, string | undefined>;
          user?: AuthUser;
        };
      };
    }) {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;
      const req = context.switchToHttp().getRequest();
      const role = req.headers["x-test-role"];
      if (!role) return false;
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

describe("Phase 8 approval chain + report (SR + Change)", () => {
  let app: INestApplication;
  const srApprove = vi.fn();
  const srReject = vi.fn();
  const chApprove = vi.fn();
  const chReject = vi.fn();
  const chUpdate = vi.fn();
  const dashboardReportCsv = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        ServiceRequestsController,
        ChangesController,
        AdminController,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => createTestAuthGuard(reflector),
          inject: [Reflector],
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        RefreshCookieOriginGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === "NODE_ENV" ? "test" : undefined),
            getOrThrow: (key: string) => {
              if (key === "CORS_ORIGIN") return "http://localhost:5173";
              throw new Error(`missing ${key}`);
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: vi.fn(),
            refresh: vi.fn(),
            logout: vi.fn(),
          },
        },
        {
          provide: ServiceRequestsService,
          useValue: {
            list: vi.fn(),
            get: vi.fn(),
            create: vi.fn(),
            approve: srApprove,
            reject: srReject,
            startFulfillment: vi.fn(),
            fulfill: vi.fn(),
          },
        },
        {
          provide: ChangesService,
          useValue: {
            list: vi.fn(),
            get: vi.fn(),
            create: vi.fn(),
            approve: chApprove,
            reject: chReject,
            update: chUpdate,
          },
        },
        {
          provide: AdminService,
          useValue: {
            dashboardStats: vi.fn(),
            dashboardReportCsv,
            ticketsByStatus: vi.fn(),
            slaPerformance: vi.fn(),
            volumeByModule: vi.fn(),
            statusDistribution: vi.fn(),
            slaCompliance: vi.fn(),
            listAuditLogs: vi.fn(),
            queueHealth: vi.fn(),
            listUsers: vi.fn(),
            createUser: vi.fn(),
            getUser: vi.fn(),
            updateUser: vi.fn(),
            listSlaRules: vi.fn(),
            updateSlaRule: vi.fn(),
            updateUserRole: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("(1) Manager SR/Change approve → PendingApproval; final approve 403", async () => {
    srApprove.mockResolvedValueOnce({ status: "PendingApproval" });
    chApprove.mockResolvedValueOnce({ status: "PendingApproval" });
    srApprove.mockRejectedValueOnce(
      new ForbiddenException("Manager cannot final-approve; waiting on Admin"),
    );
    chApprove.mockRejectedValueOnce(
      new ForbiddenException("Manager cannot final-approve; waiting on Admin"),
    );

    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/approve`)
      .set("x-test-role", "Manager")
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("PendingApproval");
      });

    await request(app.getHttpServer())
      .patch(`/changes/${ID}/approve`)
      .set("x-test-role", "Manager")
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe("PendingApproval");
      });

    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/approve`)
      .set("x-test-role", "Manager")
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/changes/${ID}/approve`)
      .set("x-test-role", "Manager")
      .expect(403);
  });

  it("(2) Admin 403 on managed Submitted; succeeds on PendingApproval; direct when no project", async () => {
    srApprove.mockRejectedValueOnce(
      new ForbiddenException(
        "Admin cannot approve while a project manager must act first",
      ),
    );
    chApprove.mockRejectedValueOnce(
      new ForbiddenException(
        "Admin cannot approve while a project manager must act first",
      ),
    );
    srReject.mockRejectedValueOnce(
      new ForbiddenException(
        "Admin cannot reject while a project manager must act first",
      ),
    );
    chReject.mockRejectedValueOnce(
      new ForbiddenException(
        "Admin cannot reject while a project manager must act first",
      ),
    );
    srApprove.mockResolvedValueOnce({ status: "Approved" });
    chApprove.mockResolvedValueOnce({ status: "Approved" });
    srApprove.mockResolvedValueOnce({ status: "Approved" });
    chApprove.mockResolvedValueOnce({ status: "Approved" });

    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/changes/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/reject`)
      .set("x-test-role", "Admin")
      .send({ reason: "nope" })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/changes/${ID}/reject`)
      .set("x-test-role", "Admin")
      .send({ reason: "nope" })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/changes/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/service-requests/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/changes/${ID}/approve`)
      .set("x-test-role", "Admin")
      .expect(200);
  });

  it("(3) report route: Agent/EndUser/Manager 403, unauth 401/403, Admin 200 excel", async () => {
    dashboardReportCsv.mockResolvedValue({
      body: '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"></Workbook>',
      filename: "yukti-summary-30d-2026-10-08.xls",
      contentType: "application/vnd.ms-excel; charset=utf-8",
    });

    for (const role of ["Agent", "EndUser", "Manager"] as const) {
      await request(app.getHttpServer())
        .get("/admin/dashboard/report?range=30d&type=summary&format=excel")
        .set("x-test-role", role)
        .expect(403);
    }

    await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=30d")
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });

    const ok = await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=30d&type=summary&format=excel")
      .set("x-test-role", "Admin")
      .expect(200);
    expect(String(ok.headers["content-type"])).toMatch(/ms-excel|spreadsheet/i);
    expect(ok.text).toMatch(/Workbook/);
    expect(ok.headers["content-disposition"]).toMatch(
      /yukti-summary-30d-.*\.xls/,
    );
    expect(String(ok.headers["cache-control"])).toMatch(/no-store/i);
    expect(dashboardReportCsv).toHaveBeenCalledWith(
      "30d",
      "summary",
      ID,
      "excel",
    );
  });
});

describe("Phase 8 ChangesService unit: bypass + concurrency", () => {
  const admin = {
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    email: "admin@sadhox.local",
    role: "Admin" as const,
    name: "Admin",
  };
  const agent = {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "agent@sadhox.local",
    role: "Agent" as const,
    name: "Agent",
  };

  function row(status: string, projectId: string | null = "proj-1") {
    return {
      id: ID,
      title: "Change",
      description: "d",
      type: "Normal",
      status,
      scheduledStart: new Date("2030-01-01T10:00:00Z"),
      scheduledEnd: new Date("2030-01-01T12:00:00Z"),
      rollbackPlan: "rollback",
      createdBy: agent.userId,
      approvedBy: null,
      projectId,
      moduleId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  function createService(existing: ReturnType<typeof row>, returning: unknown[] = []) {
    const whereUpdate = vi.fn(() => ({
      returning: vi.fn(async () => returning),
    }));
    const set = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set }));
    const limit = vi.fn(async () => [existing]);
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit })),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn(async () => [
                    {
                      ...existing,
                      createdByName: "Agent",
                      projectName: null,
                      moduleName: null,
                    },
                  ]),
                })),
              })),
            })),
          })),
        })),
      })),
      update,
    };
    const projectAccess = {
      assertCanViewTicket: vi.fn().mockResolvedValue(undefined),
      assertCanApprove: vi.fn().mockResolvedValue(undefined),
      projectRequiresManagerStep: vi.fn(async (projectId: string | null) =>
        projectId != null && projectId !== "",
      ),
    };
    const service = new ChangesService(
      db as never,
      { sendApprovalOutcome: vi.fn().mockResolvedValue(undefined) } as never,
      projectAccess as never,
      {
        resolveTicketProjectFields: vi.fn(),
      } as never,
    );
    return { service, update, whereUpdate, projectAccess };
  }

  it("PATCH Approved or Rolled Back is refused for Agent, and for Admin while a manager must act", async () => {
    for (const status of ["Submitted", "PendingApproval"] as const) {
      for (const next of ["Approved", "Rolled Back"] as const) {
        const { service } = createService(row(status));
        await expect(
          service.update(agent, ID, { status: next }),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    }
    for (const next of ["Approved", "Rolled Back"] as const) {
      const { service } = createService(row("Submitted"));
      await expect(
        service.update(admin, ID, { status: next }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it("second concurrent approve gets ConflictException", async () => {
    const existing = row("PendingApproval", null);
    const { service } = createService(existing, []); // empty returning = lost race
    await expect(service.approve(admin, ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
