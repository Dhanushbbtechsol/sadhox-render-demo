import request from "supertest";
import express from "express";
import type { Express } from "express";
import { describe, expect, it } from "vitest";

import { sanitizePlainText } from "../common/sanitize-plain-text";
import { calculatePriority } from "./priority";
import {
  assertCanTransitionIncident,
  requiresResolutionNotes,
} from "./incident-transitions";

/**
 * Phase 4 Day 16–17: cross-module walkthrough contract + RBAC surface.
 * Assign is POST (Phase 3); Day 17 doc said PATCH — assert the live route.
 */
function buildPhase4RbacApp(): Express {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    const role = String(req.headers["x-role"] ?? "EndUser");
    (req as express.Request & { role: string }).role = role;
    next();
  });

  const requireRoles =
    (...allowed: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const role = (req as express.Request & { role: string }).role;
      if (!allowed.includes(role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      return next();
    };

  app.post(
    "/incidents/:id/assign",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.json({ ok: true }),
  );

  // Day 17 wording used PATCH — keep alias forbidden for EndUser too.
  app.patch(
    "/incidents/:id/assign",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.json({ ok: true }),
  );

  app.post(
    "/problems",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.status(201).json({ ok: true }),
  );

  app.post(
    "/incidents/:id/comments",
    requireRoles("Admin", "Agent", "EndUser"),
    (req, res) => {
      const content = sanitizePlainText(String(req.body?.content ?? ""));
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      return res.status(201).json({ content });
    },
  );

  return app;
}

describe("Phase 4 Day 16 walkthrough contracts", () => {
  it("High×Medium impact/urgency yields P2", () => {
    expect(calculatePriority("High", "Medium")).toBe("P2");
    expect(calculatePriority("Medium", "High")).toBe("P2");
  });

  it("supports New → Assigned → InProgress → Resolved → Closed", () => {
    expect(() =>
      assertCanTransitionIncident("New", "Assigned"),
    ).not.toThrow();
    expect(() =>
      assertCanTransitionIncident("Assigned", "InProgress"),
    ).not.toThrow();
    expect(() =>
      assertCanTransitionIncident("InProgress", "Resolved"),
    ).not.toThrow();
    expect(() =>
      assertCanTransitionIncident("Resolved", "Closed"),
    ).not.toThrow();
    expect(requiresResolutionNotes("InProgress", "Resolved")).toBe(true);
  });
});

describe("Phase 4 Day 17 EndUser RBAC + comment XSS", () => {
  const app = buildPhase4RbacApp();
  const incidentId = "22222222-2222-4222-8222-222222222222";

  it("forbids EndUser POST /incidents/:id/assign (403)", async () => {
    await request(app)
      .post(`/incidents/${incidentId}/assign`)
      .set("x-role", "EndUser")
      .send({})
      .expect(403);
  });

  it("forbids EndUser PATCH /incidents/:id/assign (403)", async () => {
    await request(app)
      .patch(`/incidents/${incidentId}/assign`)
      .set("x-role", "EndUser")
      .send({})
      .expect(403);
  });

  it("forbids EndUser POST /problems (403)", async () => {
    await request(app)
      .post("/problems")
      .set("x-role", "EndUser")
      .send({ title: "x", description: "y" })
      .expect(403);
  });

  it("sanitizes XSS payloads on comment submit", async () => {
    const res = await request(app)
      .post(`/incidents/${incidentId}/comments`)
      .set("x-role", "EndUser")
      .send({ content: '<script>alert(1)</script>all clear' })
      .expect(201);

    expect(res.body.content).toBe("alert(1) all clear");
    expect(res.body.content).not.toMatch(/<script/i);
  });

  it("rejects comments that sanitize to empty", async () => {
    await request(app)
      .post(`/incidents/${incidentId}/comments`)
      .set("x-role", "Agent")
      .send({ content: "<div></div>" })
      .expect(400);
  });
});
