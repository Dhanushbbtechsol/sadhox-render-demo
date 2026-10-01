import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CreateServiceRequestDto,
  FulfillServiceRequestDto,
  RejectServiceRequestDto,
} from "./dto/service-request.dto";

type Role = "Admin" | "Agent" | "EndUser";

function userFor(role: Role) {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    email: `${role.toLowerCase()}@sadhox.local`,
    role,
    name: role,
  };
}

async function parseDto<T extends object>(
  Cls: new () => T,
  body: unknown,
): Promise<{ ok: true; value: T } | { ok: false; messages: string[] }> {
  const value = plainToInstance(Cls, body);
  const errors = await validate(value as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length === 0) return { ok: true, value };
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
  return { ok: false, messages };
}

function roleGate(allowed: Role[], role: string | undefined): boolean {
  return Boolean(role && allowed.includes(role as Role));
}

function buildApp(svc: {
  create: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  reject: ReturnType<typeof vi.fn>;
  startFulfillment: ReturnType<typeof vi.fn>;
  fulfill: ReturnType<typeof vi.fn>;
}): Express {
  const app = express();
  app.use(express.json());

  app.post("/service-requests", async (req, res) => {
    const role = req.header("x-role");
    if (!roleGate(["Admin", "Agent", "EndUser"], role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "requesterId")) {
      return res.status(400).json({ message: "requesterId override forbidden" });
    }
    const parsed = await parseDto(CreateServiceRequestDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await svc.create(userFor(role as Role), parsed.value);
    return res.status(201).json(result);
  });

  app.patch("/service-requests/:id/approve", async (req, res) => {
    const role = req.header("x-role");
    if (!roleGate(["Admin"], role)) {
      return res.status(403).json({ message: "Admin role required" });
    }
    const result = await svc.approve(userFor("Admin"), req.params.id);
    return res.json(result);
  });

  app.patch("/service-requests/:id/reject", async (req, res) => {
    const role = req.header("x-role");
    if (!roleGate(["Admin"], role)) {
      return res.status(403).json({ message: "Admin role required" });
    }
    const parsed = await parseDto(RejectServiceRequestDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await svc.reject(
      userFor("Admin"),
      req.params.id,
      parsed.value,
    );
    return res.json(result);
  });

  app.patch("/service-requests/:id/start-fulfillment", async (req, res) => {
    const role = req.header("x-role");
    if (!roleGate(["Admin", "Agent"], role)) {
      return res.status(403).json({ message: "Agent or Admin role required" });
    }
    const result = await svc.startFulfillment(
      userFor(role as Role),
      req.params.id,
    );
    return res.json(result);
  });

  app.patch("/service-requests/:id/fulfill", async (req, res) => {
    const role = req.header("x-role");
    if (!roleGate(["Admin", "Agent"], role)) {
      return res.status(403).json({ message: "Agent or Admin role required" });
    }
    const parsed = await parseDto(FulfillServiceRequestDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await svc.fulfill(
      userFor(role as Role),
      req.params.id,
      parsed.value,
    );
    return res.json(result);
  });

  return app;
}

describe("Service requests API (supertest) — submit + approval gating", () => {
  const svc = {
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    startFulfillment: vi.fn(),
    fulfill: vi.fn(),
  };
  const app = buildApp(svc);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /service-requests accepts EndUser submission", async () => {
    svc.create.mockResolvedValue({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "Submitted",
    });
    const res = await request(app)
      .post("/service-requests")
      .set("x-role", "EndUser")
      .send({
        catalogId: "11111111-1111-4111-8111-111111111111",
        justification: "Need laptop",
        urgency: "Medium",
        fields: { laptopType: "Standard" },
      });
    expect(res.status).toBe(201);
    expect(svc.create).toHaveBeenCalled();
  });

  it("PATCH approve is Admin-only (Agent and EndUser forbidden)", async () => {
    for (const role of ["Agent", "EndUser"] as const) {
      const denied = await request(app)
        .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/approve")
        .set("x-role", role)
        .send({});
      expect(denied.status).toBe(403);
    }
    expect(svc.approve).not.toHaveBeenCalled();

    svc.approve.mockResolvedValue({ status: "Approved" });
    const ok = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/approve")
      .set("x-role", "Admin")
      .send({});
    expect(ok.status).toBe(200);
    expect(svc.approve).toHaveBeenCalled();
  });

  it("PATCH reject requires Admin and a reason", async () => {
    const noReason = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/reject")
      .set("x-role", "Admin")
      .send({});
    expect(noReason.status).toBe(400);

    svc.reject.mockResolvedValue({ status: "Rejected" });
    const ok = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/reject")
      .set("x-role", "Admin")
      .send({ reason: "Duplicate request" });
    expect(ok.status).toBe(200);
    expect(svc.reject).toHaveBeenCalled();
  });

  it("PATCH start-fulfillment is Agent/Admin only", async () => {
    const denied = await request(app)
      .patch(
        "/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/start-fulfillment",
      )
      .set("x-role", "EndUser")
      .send({});
    expect(denied.status).toBe(403);
    expect(svc.startFulfillment).not.toHaveBeenCalled();

    svc.startFulfillment.mockResolvedValue({ status: "In Fulfillment" });
    const ok = await request(app)
      .patch(
        "/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/start-fulfillment",
      )
      .set("x-role", "Agent")
      .send({});
    expect(ok.status).toBe(200);
    expect(svc.startFulfillment).toHaveBeenCalled();
  });

  it("PATCH fulfill requires Agent/Admin and notes", async () => {
    const denied = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/fulfill")
      .set("x-role", "EndUser")
      .send({ notes: "done" });
    expect(denied.status).toBe(403);

    const noNotes = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/fulfill")
      .set("x-role", "Agent")
      .send({});
    expect(noNotes.status).toBe(400);

    svc.fulfill.mockResolvedValue({ status: "Fulfilled" });
    const ok = await request(app)
      .patch("/service-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/fulfill")
      .set("x-role", "Agent")
      .send({ notes: "Laptop delivered" });
    expect(ok.status).toBe(200);
    expect(svc.fulfill).toHaveBeenCalled();
  });

  it("POST rejects EndUser status/approval field tampering (forbidNonWhitelisted)", async () => {
    const res = await request(app)
      .post("/service-requests")
      .set("x-role", "EndUser")
      .send({
        catalogId: "11111111-1111-4111-8111-111111111111",
        justification: "Need laptop",
        urgency: "Medium",
        status: "Approved",
        approverId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      });
    expect(res.status).toBe(400);
    expect(svc.create).not.toHaveBeenCalled();
  });
});
