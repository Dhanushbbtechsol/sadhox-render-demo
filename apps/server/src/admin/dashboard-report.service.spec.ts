import {
  UnprocessableEntityException,
  type INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RolesGuard } from "../common/guards/roles.guard";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { UserRole } from "../common/types/roles";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { REPORT_ROW_CAP, REPORT_STATUS_FILTER } from "./dashboard-report-csv";

const ACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

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
        userId: ACTOR,
        email: `${role.toLowerCase()}@sadhox.local`,
        role: role as UserRole,
        name: role,
      };
      return true;
    },
  };
}

describe("REPORT_STATUS_FILTER mapping", () => {
  it("maps assigned / in-progress / approved statuses as confirmed", () => {
    expect(REPORT_STATUS_FILTER.assigned).toEqual({
      incidents: ["Assigned"],
      serviceRequests: [],
      changes: [],
    });
    expect(REPORT_STATUS_FILTER["in-progress"]).toEqual({
      incidents: ["InProgress"],
      serviceRequests: ["InFulfillment"],
      changes: ["Scheduled", "Implementing"],
    });
    expect(REPORT_STATUS_FILTER.approved).toEqual({
      incidents: [],
      serviceRequests: ["Approved"],
      changes: ["Approved"],
    });
  });
});

describe("GET /admin/dashboard/report Phase 9 desk report", () => {
  let app: INestApplication;
  const deskReportResponse = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => createTestAuthGuard(reflector),
          inject: [Reflector],
        },
        { provide: APP_GUARD, useClass: RolesGuard },
        {
          provide: AdminService,
          useValue: {
            deskReportResponse,
            dashboardStats: vi.fn(),
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
            listEscalationRules: vi.fn(),
            updateEscalationRule: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("rejects invalid range/format with 400", async () => {
    deskReportResponse.mockReset();
    await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=forever")
      .set("x-test-role", "Admin")
      .expect(400);
    await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=30d&format=pdf")
      .set("x-test-role", "Admin")
      .expect(400);
    expect(deskReportResponse).not.toHaveBeenCalled();
  });

  it("defaults to json desk report scope All", async () => {
    deskReportResponse.mockResolvedValue({
      body: { title: "Desk report", scope: "All" },
    });
    await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=7d")
      .set("x-test-role", "Admin")
      .expect(200);
    expect(deskReportResponse).toHaveBeenCalledWith("7d", "json", "All");
  });

  it("returns csv attachment for format=csv", async () => {
    deskReportResponse.mockResolvedValue({
      body: "Title,Desk report\nScope,All\n",
      filename: "desk-report-30d.csv",
    });
    const res = await request(app.getHttpServer())
      .get("/admin/dashboard/report?range=30d&format=csv")
      .set("x-test-role", "Admin")
      .expect(200);
    expect(deskReportResponse).toHaveBeenCalledWith("30d", "csv", "All");
    expect(String(res.headers["content-type"])).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/desk-report-30d\.csv/);
  });
});

describe("AdminService dashboardReportCsv row cap + audit", () => {
  it("throws 422 when ticket rows exceed cap and writes audit on success", async () => {
    const inserted: unknown[] = [];
    const oversized = Array.from({ length: REPORT_ROW_CAP + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      title: `t${i}`,
      status: "Assigned",
      priority: "P3",
      category: "Other",
      subcategory: "Other",
      projectName: null,
      assignedTo: null,
      raisedBy: "A",
      createdAt: new Date(),
      updatedAt: new Date(),
      slaDueAt: null,
      slaBreached: false,
      resolvedAt: null,
      closedAt: null,
      description: "d",
    }));

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(oversized),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };

    const db = {
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({
        values: vi.fn(async (v: unknown) => {
          inserted.push(v);
        }),
      })),
    };

    const service = new AdminService(
      db as never,
      { getJobCounts: vi.fn() } as never,
      { getJobCounts: vi.fn() } as never,
      { getJobCounts: vi.fn() } as never,
    );

    await expect(
      service.dashboardReportCsv("30d", "assigned", ACTOR, "csv"),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(inserted).toHaveLength(0);

    // Cap OK path — one incident row
    selectChain.limit.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Assigned ticket",
        status: "Assigned",
        priority: "P2",
        category: "Network",
        subcategory: "VPN",
        projectName: null,
        assignedTo: null,
        raisedBy: "Alice",
        createdAt: new Date("2026-10-08T10:00:00Z"),
        updatedAt: new Date("2026-10-08T11:00:00Z"),
        slaDueAt: null,
        slaBreached: false,
        resolvedAt: null,
        closedAt: null,
        description: "ok",
      },
    ]);

    const ok = await service.dashboardReportCsv(
      "30d",
      "assigned",
      ACTOR,
      "csv",
    );
    expect(ok.filename).toMatch(/^yukti-assigned-30d-/);
    expect(ok.body).toContain("Assigned");
    expect(ok.body).toContain("Status");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      actorId: ACTOR,
      action: "report.export",
      entityType: "dashboard_report",
      diff: { type: "assigned", format: "csv", range: "30d", rowCount: 1 },
    });
  });
});
