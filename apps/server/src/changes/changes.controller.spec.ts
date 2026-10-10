import express from "express";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Role = "Admin" | "Agent" | "Manager" | "EndUser";

function buildApp(svc: {
  update: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
}): Express {
  const app = express();
  app.use(express.json());

  app.post("/changes", async (req, res) => {
    const role = req.header("x-role") as Role | undefined;
    if (role !== "Admin" && role !== "Agent" && role !== "EndUser") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const result = await svc.create({ userId: "u", role }, req.body);
    return res.status(201).json(result);
  });

  app.patch("/changes/:id/approve", async (req, res) => {
    const role = req.header("x-role");
    if (role !== "Admin" && role !== "Manager") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const result = await svc.approve(
      { userId: "u", role },
      req.params.id,
    );
    return res.json(result);
  });

  app.patch("/changes/:id", async (req, res) => {
    const role = req.header("x-role") as Role | undefined;
    if (role !== "Admin" && role !== "Agent" && role !== "Manager") {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const result = await svc.update(
        { userId: "u", role },
        req.params.id,
        req.body,
      );
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      const status =
        message.includes("Admin") || message.includes("disabled") ? 403 : 400;
      return res.status(status).json({ message });
    }
  });

  return app;
}

describe("Changes API (supertest) — Admin approve / EndUser request", () => {
  const svc = {
    update: vi.fn(),
    approve: vi.fn(),
    create: vi.fn(),
  };
  const app = buildApp(svc);
  const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /changes accepts EndUser request", async () => {
    svc.create.mockResolvedValue({ status: "Submitted" });
    const res = await request(app)
      .post("/changes")
      .set("x-role", "EndUser")
      .send({ title: "Need change" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Submitted");
  });

  it("PATCH /changes/:id/approve allows Admin and Manager", async () => {
    for (const role of ["Agent", "EndUser"] as const) {
      const denied = await request(app)
        .patch(`/changes/${id}/approve`)
        .set("x-role", role)
        .send({});
      expect(denied.status).toBe(403);
    }

    svc.approve.mockResolvedValue({ status: "Approved" });
    const ok = await request(app)
      .patch(`/changes/${id}/approve`)
      .set("x-role", "Admin")
      .send({});
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("Approved");

    svc.approve.mockResolvedValue({ status: "Approved" });
    const okMgr = await request(app)
      .patch(`/changes/${id}/approve`)
      .set("x-role", "Manager")
      .send({});
    expect(okMgr.status).toBe(200);
    expect(okMgr.body.status).toBe("Approved");
  });

  it("Agent cannot PATCH status to Scheduled", async () => {
    svc.update.mockRejectedValue(
      Object.assign(
        new Error(
          "Change actions are disabled; only Admin approval or rejection is allowed",
        ),
        { name: "BadRequestException" },
      ),
    );
    const res = await request(app)
      .patch(`/changes/${id}`)
      .set("x-role", "Agent")
      .send({ status: "Scheduled" });
    expect(res.status).toBe(403);
  });

  it("Agent cannot PATCH status to Rolled Back (reject gate)", async () => {
    svc.update.mockRejectedValue(
      Object.assign(
        new Error("Admin role required to set change status to Rolled Back"),
        { name: "ForbiddenException" },
      ),
    );
    const res = await request(app)
      .patch(`/changes/${id}`)
      .set("x-role", "Agent")
      .send({ status: "Rolled Back" });
    expect(res.status).toBe(403);
  });

  it("Admin cannot PATCH status to Scheduled (actions disabled)", async () => {
    svc.update.mockRejectedValue(
      Object.assign(
        new Error(
          "Change actions are disabled; only Admin approval or rejection is allowed",
        ),
        { name: "BadRequestException" },
      ),
    );
    const res = await request(app)
      .patch(`/changes/${id}`)
      .set("x-role", "Admin")
      .send({ status: "Scheduled" });
    expect(res.status).toBe(403);
  });
});
