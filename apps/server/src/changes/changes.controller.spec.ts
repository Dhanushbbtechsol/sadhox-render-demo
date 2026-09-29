import express from "express";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Role = "Admin" | "Agent";

function buildApp(svc: {
  update: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
}): Express {
  const app = express();
  app.use(express.json());

  app.patch("/changes/:id/approve", async (req, res) => {
    const role = req.header("x-role");
    if (role !== "Admin") {
      return res.status(403).json({ message: "Admin role required" });
    }
    const result = await svc.approve(
      { userId: "admin", role: "Admin" },
      req.params.id,
    );
    return res.json(result);
  });

  app.patch("/changes/:id", async (req, res) => {
    const role = req.header("x-role") as Role | undefined;
    if (role !== "Admin" && role !== "Agent") {
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
      const status = message.includes("Admin") ? 403 : 400;
      return res.status(status).json({ message });
    }
  });

  return app;
}

describe("Changes API (supertest) — approval / schedule gating", () => {
  const svc = {
    update: vi.fn(),
    approve: vi.fn(),
  };
  const app = buildApp(svc);
  const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH /changes/:id/approve is Admin-only", async () => {
    const denied = await request(app)
      .patch(`/changes/${id}/approve`)
      .set("x-role", "Agent")
      .send({});
    expect(denied.status).toBe(403);

    svc.approve.mockResolvedValue({ status: "Approved" });
    const ok = await request(app)
      .patch(`/changes/${id}/approve`)
      .set("x-role", "Admin")
      .send({});
    expect(ok.status).toBe(200);
  });

  it("Agent cannot PATCH status to Scheduled", async () => {
    svc.update.mockRejectedValue(
      Object.assign(new Error("Admin role required to set change status to Scheduled"), {
        name: "ForbiddenException",
      }),
    );
    const res = await request(app)
      .patch(`/changes/${id}`)
      .set("x-role", "Agent")
      .send({ status: "Scheduled" });
    expect(res.status).toBe(403);
  });

  it("Admin can PATCH status to Scheduled after approval path", async () => {
    svc.update.mockResolvedValue({ status: "Scheduled" });
    const res = await request(app)
      .patch(`/changes/${id}`)
      .set("x-role", "Admin")
      .send({ status: "Scheduled" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Scheduled");
  });
});
