import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import {
  CreateCommentDto,
  CreateIncidentDto,
  UpdateIncidentDto,
} from "./dto/incident.dto";
import { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";

const mockUser = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "agent@sadhox.local",
  role: "Agent",
};

const sampleIncident = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Email outage",
  description: "Users cannot send mail from Outlook.",
  category: "Email",
  impact: "High",
  urgency: "High",
  priority: "P1",
  status: "New",
  assignedTo: null,
  reporterId: mockUser.userId,
  slaDueAt: new Date().toISOString(),
  resolvedAt: null,
  closedAt: null,
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

function buildApp(incidents: {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  listComments: jest.Mock;
  addComment: jest.Mock;
}): Express {
  const app = express();
  app.use(express.json());

  app.get("/incidents", async (req, res) => {
    const parsed = await parseDto(ListIncidentsQueryDto, req.query);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await incidents.list(mockUser, parsed.value);
    return res.json(result);
  });

  app.post("/incidents", async (req, res) => {
    const parsed = await parseDto(CreateIncidentDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await incidents.create(mockUser, parsed.value);
    return res.status(201).json(result);
  });

  app.get("/incidents/:id", async (req, res) => {
    const result = await incidents.get(mockUser, req.params.id);
    return res.json(result);
  });

  app.patch("/incidents/:id", async (req, res) => {
    const parsed = await parseDto(UpdateIncidentDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await incidents.update(mockUser, req.params.id, parsed.value);
    return res.json(result);
  });

  app.get("/incidents/:id/comments", async (req, res) => {
    const result = await incidents.listComments(mockUser, req.params.id);
    return res.json(result);
  });

  app.post("/incidents/:id/comments", async (req, res) => {
    const parsed = await parseDto(CreateCommentDto, req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.messages });
    const result = await incidents.addComment(
      mockUser,
      req.params.id,
      parsed.value,
    );
    return res.status(201).json(result);
  });

  return app;
}

describe("Incidents API (supertest)", () => {
  const incidents = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    listComments: jest.fn(),
    addComment: jest.fn(),
  };
  const app = buildApp(incidents);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /incidents returns paginated list", async () => {
    incidents.list.mockResolvedValue({
      data: [sampleIncident],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app)
      .get("/incidents")
      .query({ status: "New", page: 1 })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(incidents.list).toHaveBeenCalled();
  });

  it("POST /incidents creates with validated body", async () => {
    incidents.create.mockResolvedValue(sampleIncident);

    const res = await request(app)
      .post("/incidents")
      .send({
        title: "Email outage",
        description: "Users cannot send mail from Outlook.",
        category: "Email",
        impact: "High",
        urgency: "High",
      })
      .expect(201);

    expect(res.body.priority).toBe("P1");
    expect(incidents.create).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({ category: "Email", impact: "High" }),
    );
  });

  it("POST /incidents rejects invalid DTO", async () => {
    await request(app)
      .post("/incidents")
      .send({ title: "x", description: "short", category: "Email" })
      .expect(400);
    expect(incidents.create).not.toHaveBeenCalled();
  });

  it("PATCH /incidents/:id updates fields", async () => {
    incidents.update.mockResolvedValue({ ...sampleIncident, status: "InProgress" });

    await request(app)
      .patch(`/incidents/${sampleIncident.id}`)
      .send({ status: "InProgress" })
      .expect(200);

    expect(incidents.update).toHaveBeenCalledWith(
      mockUser,
      sampleIncident.id,
      expect.objectContaining({ status: "InProgress" }),
    );
  });

  it("POST /incidents/:id/comments creates comment", async () => {
    const comment = {
      id: "33333333-3333-4333-8333-333333333333",
      ticketId: sampleIncident.id,
      ticketType: "incident",
      authorId: mockUser.userId,
      authorName: "Alice Agent",
      content: "Investigating mail relay",
      createdAt: new Date().toISOString(),
    };
    incidents.addComment.mockResolvedValue(comment);

    const res = await request(app)
      .post(`/incidents/${sampleIncident.id}/comments`)
      .send({ content: "Investigating mail relay" })
      .expect(201);

    expect(res.body.content).toBe("Investigating mail relay");
  });
});
