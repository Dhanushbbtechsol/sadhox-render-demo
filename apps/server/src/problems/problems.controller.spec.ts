import { describe, expect, it, vi, beforeEach } from "vitest";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import {
  CreateProblemDto,
  ListProblemsQueryDto,
  UpdateProblemDto,
} from "./dto/problem.dto";

const sampleProblem = {
  id: "44444444-4444-4444-8444-444444444444",
  title: "Recurring VPN drops",
  description: "Multiple sites lose VPN mid-session.",
  rootCause: null,
  knownError: false,
  status: "Open",
  assignedTo: null,
  assigneeName: null,
  linkedIncidentIds: ["22222222-2222-4222-8222-222222222222"],
  linkedIncidents: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "VPN drop site A",
      status: "InProgress",
      priority: "P2",
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

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

function buildApp(problems: {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  linkIncident: ReturnType<typeof vi.fn>;
}): Express {
  const app = express();
  app.use(express.json());

  app.get("/problems", async (req, res) => {
    const parsed = await parseDto(ListProblemsQueryDto, req.query);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    return res.json(await problems.list(parsed.value));
  });

  app.post("/problems", async (req, res) => {
    const parsed = await parseDto(CreateProblemDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    return res.status(201).json(await problems.create(parsed.value));
  });

  app.get("/problems/:id", async (req, res) => {
    return res.json(await problems.get(req.params.id));
  });

  app.post("/problems/:id/incidents/:incidentId", async (req, res) => {
    return res.json(
      await problems.linkIncident(req.params.id, req.params.incidentId),
    );
  });

  app.patch("/problems/:id", async (req, res) => {
    const parsed = await parseDto(UpdateProblemDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    return res.json(await problems.update(req.params.id, parsed.value));
  });

  return app;
}

describe("Problems API (supertest)", () => {
  const problems = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    linkIncident: vi.fn(),
  };
  const app = buildApp(problems);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /problems returns paginated list", async () => {
    problems.list.mockResolvedValue({
      data: [sampleProblem],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app).get("/problems").expect(200);
    expect(res.body.data[0].linkedIncidentIds).toHaveLength(1);
  });

  it("POST /problems creates with linked incidents", async () => {
    problems.create.mockResolvedValue(sampleProblem);

    const res = await request(app)
      .post("/problems")
      .send({
        title: "Recurring VPN drops",
        description: "Multiple sites lose VPN mid-session.",
        linkedIncidentIds: ["22222222-2222-4222-8222-222222222222"],
      })
      .expect(201);

    expect(res.body.status).toBe("Open");
    expect(problems.create).toHaveBeenCalled();
  });

  it("POST /problems/:id/incidents/:incidentId links additively", async () => {
    const incidentId = "33333333-3333-4333-8333-333333333333";
    problems.linkIncident.mockResolvedValue({
      ...sampleProblem,
      linkedIncidentIds: [...sampleProblem.linkedIncidentIds, incidentId],
    });

    await request(app)
      .post(`/problems/${sampleProblem.id}/incidents/${incidentId}`)
      .expect(200);

    expect(problems.linkIncident).toHaveBeenCalledWith(
      sampleProblem.id,
      incidentId,
    );
  });

  it("PATCH /problems/:id updates status and links", async () => {
    problems.update.mockResolvedValue({
      ...sampleProblem,
      status: "Investigating",
    });

    await request(app)
      .patch(`/problems/${sampleProblem.id}`)
      .send({ status: "Investigating", knownError: false })
      .expect(200);

    expect(problems.update).toHaveBeenCalledWith(
      sampleProblem.id,
      expect.objectContaining({ status: "Investigating" }),
    );
  });
});
