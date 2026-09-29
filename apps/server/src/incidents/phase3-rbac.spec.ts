import request from "supertest";
import express from "express";
import type { Express } from "express";

/**
 * Supertest RBAC surface mirroring Nest @Roles gates for Phase 3 Checkpoint 3.
 * EndUsers must not close incidents or link/update problems.
 */
function buildRbacApp(): Express {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
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

  app.patch(
    "/incidents/:id",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.json({ ok: true }),
  );

  app.post(
    "/incidents/:id/assign",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.json({ ok: true }),
  );

  app.patch(
    "/problems/:id",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.json({ ok: true }),
  );

  app.post(
    "/problems",
    requireRoles("Admin", "Agent"),
    (_req, res) => res.status(201).json({ ok: true }),
  );

  return app;
}

describe("Phase 3 EndUser RBAC (supertest)", () => {
  const app = buildRbacApp();
  const incidentId = "22222222-2222-4222-8222-222222222222";
  const problemId = "44444444-4444-4444-8444-444444444444";

  it("forbids EndUser from closing an incident", async () => {
    await request(app)
      .patch(`/incidents/${incidentId}`)
      .set("x-role", "EndUser")
      .send({ status: "Closed" })
      .expect(403);
  });

  it("forbids EndUser from assigning an incident", async () => {
    await request(app)
      .post(`/incidents/${incidentId}/assign`)
      .set("x-role", "EndUser")
      .send({})
      .expect(403);
  });

  it("forbids EndUser from linking problems", async () => {
    await request(app)
      .patch(`/problems/${problemId}`)
      .set("x-role", "EndUser")
      .send({ linkedIncidentIds: [incidentId] })
      .expect(403);

    await request(app)
      .post("/problems")
      .set("x-role", "EndUser")
      .send({ title: "x", description: "should be denied" })
      .expect(403);
  });

  it("allows Agent to close and link", async () => {
    await request(app)
      .patch(`/incidents/${incidentId}`)
      .set("x-role", "Agent")
      .send({ status: "Closed" })
      .expect(200);

    await request(app)
      .patch(`/problems/${problemId}`)
      .set("x-role", "Agent")
      .send({ linkedIncidentIds: [incidentId] })
      .expect(200);
  });
});
